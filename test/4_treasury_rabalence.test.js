const { expect } = require("chai");
const { ethers } = require("hardhat");

const INPUT_ETH = ethers.parseEther("1000"); // 매입할 ETH
const MAX_SUPPLY = 70000000; // 최대 공급량 1억 개
const BUY_ITERATIONS = 500; // 구매 반복 횟수

describe("Bonding Curve Test", function () {
    let gasToken, bondingCurve, exchange, treasury, reserve, rebalancer;
    let owner, buyer, seller;

    beforeEach(async function () {
        const signers = await ethers.getSigners();
        owner = signers[0];
        buyer = signers[1];
        seller = signers[2];

        const ReserveMock = await ethers.getContractFactory("Reserve");
        reserve = await ReserveMock.deploy();
        await reserve.waitForDeployment();

        const GASTokenMock = await ethers.getContractFactory("GASToken");
        gasToken = await GASTokenMock.deploy();
        await gasToken.waitForDeployment();

        const BondingCurveDataLib = await ethers.getContractFactory("BondingCurveData");
        const bondingCurveData = await BondingCurveDataLib.deploy();
        await bondingCurveData.waitForDeployment();

        const bondingCurveDataAddress = await bondingCurveData.getAddress();
        const BondingCurveFactory = await ethers.getContractFactory("BondingCurve", {
            libraries: {
                "contracts/BondingCurveData.sol:BondingCurveData": bondingCurveDataAddress, 
            },
        });
        bondingCurve = await BondingCurveFactory.deploy(gasToken.getAddress());
        await bondingCurve.waitForDeployment();

        const TokenExchangeMock = await ethers.getContractFactory("TokenExchange");
        exchange = await TokenExchangeMock.deploy(
            bondingCurve.getAddress(),
            gasToken.getAddress(),
            reserve.getAddress(),
            ethers.ZeroAddress // Treasury 주소는 이후 업데이트됨
        );
        await exchange.waitForDeployment();

        const TreasuryMock = await ethers.getContractFactory("Treasury");
        treasury = await TreasuryMock.deploy(
            reserve.getAddress(),
            gasToken.getAddress(),
            exchange.getAddress(),
            ethers.ZeroAddress // 리밸런서 주소는 이후 업데이트됨
        );
        await treasury.waitForDeployment();

        // 리밸런서 배포 추가
        const RebalancerMock = await ethers.getContractFactory("Rebalancer");
        rebalancer = await RebalancerMock.deploy(treasury.getAddress());
        await rebalancer.waitForDeployment();

        // 트레저리에 리밸런서 업데이트
        await treasury.setRebalancer(rebalancer.getAddress());
        await exchange.updateTreasury(treasury.getAddress());
        await gasToken.setExchange(exchange.getAddress());
    });

    it("should correctly set up contract dependencies", async function () {
        expect(await treasury.reserve()).to.equal(await reserve.getAddress());
        expect(await treasury.gasToken()).to.equal(await gasToken.getAddress());
        expect(await treasury.exchange()).to.equal(await exchange.getAddress());
        expect(await treasury.rebalancer()).to.equal(await rebalancer.getAddress()); // ✅ 리밸런서 검증 추가

        expect(await exchange.reserve()).to.equal(await reserve.getAddress());
        expect(await exchange.gasToken()).to.equal(await gasToken.getAddress());
        expect(await exchange.treasury()).to.equal(await treasury.getAddress());

        expect(await bondingCurve.gasToken()).to.equal(await gasToken.getAddress());
    });

    it("should trigger rebalancer correctly", async function () {

        await exchange.connect(buyer).buy({ value: INPUT_ETH });

        const initialTreasuryBalance = await ethers.provider.getBalance(treasury.getAddress());
        const initialReserveBalance = await ethers.provider.getBalance(reserve.getAddress());

        console.log(`🔹 Initial Treasury ETH Balance: ${ethers.formatEther(initialTreasuryBalance)} ETH`);
        console.log(`🔹 Initial Reserve ETH Balance: ${ethers.formatEther(initialReserveBalance)} ETH`);

        // ✅ 리밸런서 실행
        await rebalancer.triggerRebalance();

        const finalTreasuryBalance = await ethers.provider.getBalance(treasury.getAddress());
        const finalReserveBalance = await ethers.provider.getBalance(reserve.getAddress());

        console.log(`✅ Final Treasury ETH Balance: ${ethers.formatEther(finalTreasuryBalance)} ETH`);
        console.log(`✅ Final Reserve ETH Balance: ${ethers.formatEther(finalReserveBalance)} ETH`);

    });
    
    // 스프레드가 0.5 이후에 테스트 하기 위함
    it("should trigger rebalancer correctly after minting 70M GAST", async function () {
        // ✅ 7천만 개까지 GAST 발행
        const finalSupply = await mintToMaxSupply(buyer, exchange, gasToken, reserve, treasury);
        // expect(finalSupply).to.equal(MAX_SUPPLY);
    
        // ✅ 리밸런싱 실행 전 잔액 확인
        const initialTreasuryBalance = await ethers.provider.getBalance(treasury.getAddress());
        const initialReserveBalance = await ethers.provider.getBalance(reserve.getAddress());
    
        console.log(`🔹 Initial Treasury ETH Balance: ${ethers.formatEther(initialTreasuryBalance)} ETH`);
        console.log(`🔹 Initial Reserve ETH Balance: ${ethers.formatEther(initialReserveBalance)} ETH`);
    
        // ✅ 리밸런서 실행
        await rebalancer.triggerRebalance();
    
        // ✅ 리밸런싱 실행 후 잔액 확인
        const finalTreasuryBalance = await ethers.provider.getBalance(treasury.getAddress());
        const finalReserveBalance = await ethers.provider.getBalance(reserve.getAddress());
    
        console.log(`✅ Final Treasury ETH Balance: ${ethers.formatEther(finalTreasuryBalance)} ETH`);
        console.log(`✅ Final Reserve ETH Balance: ${ethers.formatEther(finalReserveBalance)} ETH`);
    });
});

async function mintToMaxSupply(buyer, exchange, gasToken, reserve, treasury) {
    console.log("🚀 Starting minting process to reach 100M GAST...");

    for (let i = 1; i <= BUY_ITERATIONS; i++) {
        const buyerBalanceBefore = await gasToken.balanceOf(buyer.address); // 구매 전 잔액
        await exchange.connect(buyer).buy({ value: INPUT_ETH });
        const buyerBalanceAfter = await gasToken.balanceOf(buyer.address); // 구매 후 잔액

        const supply = await gasToken.totalSupply();
        const reserveBalance = await ethers.provider.getBalance(reserve.target);
        const treasuryBalance = await ethers.provider.getBalance(treasury.target);
        
        console.log(`🔹 Iteration ${i}: Bought GAST`);
        console.log(`🔍 Total Supply: ${supply.toString()}`);
        console.log(`🏦 Reserve ETH: ${ethers.formatEther(reserveBalance)} ETH`);
        console.log(`💰 Treasury ETH: ${ethers.formatEther(treasuryBalance)} ETH`);
        console.log(`👤 Buyer GAST Balance: ${buyerBalanceBefore.toString()} → ${buyerBalanceAfter.toString()}`);
        console.log(`                                          `);

        if (supply >= MAX_SUPPLY) {
            console.log("🎯 ---------------------------------------------");
            console.log("🎯 | Supply reached 70 million, stopping loop. |");
            console.log("🎯 ---------------------------------------------");
            break;
        }
    }

    return await gasToken.totalSupply(); // 최종 공급량 반환
}
