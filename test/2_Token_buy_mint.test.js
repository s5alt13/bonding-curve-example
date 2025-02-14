const { expect } = require("chai");
const { ethers } = require("hardhat");

const MAX_SUPPLY = 100000000; // 최대 공급량 1억 개

const INPUT_ETH = ethers.parseEther("1200"); // 매입할 ETH
const BUY_ITERATIONS = 500; // 구매 반복 횟수

describe("Bonding Curve Test", function () {
    let gasToken, bondingCurve, exchange, treasury, reserve;
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

    it("should mint GAST up to 100 million supply", async function () {
        const finalSupply = await mintToMaxSupply(buyer, exchange, gasToken, reserve, treasury);
        expect(finalSupply).to.equal(MAX_SUPPLY);
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
        if (supply >= MAX_SUPPLY) {
            console.log("🎯 ---------------------------------------------");
            console.log("🎯 | Supply reached 100 million, stopping loop. |");
            console.log("🎯 ---------------------------------------------");
            break;
        }
    }

    return await gasToken.totalSupply(); // 최종 공급량 반환
}