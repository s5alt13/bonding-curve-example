const { expect } = require("chai");
const { ethers } = require("hardhat");

const MAX_SUPPLY = 100000000; // 최대 공급량 1억 개
const INPUT_ETH = ethers.parseEther("1200"); // 매입할 ETH
const SELL_BATCH_SIZE = 1500000; // 150만 개씩 판매

const BUY_ITERATIONS = 500; // 구매 반복 횟수
const SELL_ITERATIONS = 1000; // 판매 반복 횟수

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
            exchange.getAddress()
        );
        await treasury.waitForDeployment();

        await exchange.updateTreasury(treasury.getAddress());
        await gasToken.setExchange(exchange.getAddress());
    });

    it("should correctly set up contract dependencies", async function () {
        expect(await treasury.reserve()).to.equal(await reserve.getAddress());
        expect(await treasury.gasToken()).to.equal(await gasToken.getAddress());
        expect(await treasury.exchange()).to.equal(await exchange.getAddress());

        expect(await exchange.reserve()).to.equal(await reserve.getAddress());
        expect(await exchange.gasToken()).to.equal(await gasToken.getAddress());
        expect(await exchange.treasury()).to.equal(await treasury.getAddress());

        expect(await bondingCurve.gasToken()).to.equal(await gasToken.getAddress());
    });

    it("should mint GAST up to 100 million supply", async function () {
        const finalSupply = await mintToMaxSupply(buyer, exchange, gasToken, reserve, treasury);
        expect(finalSupply).to.equal(MAX_SUPPLY);
    });

    it("should burn GAST down to zero supply", async function () {
        await mintToMaxSupply(buyer, exchange, gasToken, reserve, treasury);
        // Buyer가 Seller에게 1억 개 GAST 전송
        await gasToken.connect(buyer).transfer(seller.address, MAX_SUPPLY);
        console.log(`✅ Buyer transferred ${MAX_SUPPLY} GAST to Seller`);
        
        // Seller가 TokenExchange에 권한 부여
        await gasToken.connect(seller).approve(exchange.target, MAX_SUPPLY);
        console.log("✅ Seller approved 100M GAST for exchange contract");
    
        await sellToZeroSupply(seller, exchange, gasToken, reserve, treasury);
        expect(await gasToken.totalSupply()).to.equal(0);
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

async function sellToZeroSupply(seller, exchange, gasToken, reserve, treasury) {
    console.log("🚀 Starting sell process to reach 0 GAST...");

    let totalWithdrawnETH = ethers.parseEther("0"); // 누적 출금 ETH 추적

    for (let i = 1; i <= SELL_ITERATIONS; i++) {

        const reserveInstance = await ethers.getContractAt("Reserve", reserve.target);
        const treasuryInstance = await ethers.getContractAt("Treasury", treasury.target);

        const sellerGastBalance = await gasToken.balanceOf(seller.address);
        const totalSupply = await gasToken.totalSupply();
        const reserveBalance = await ethers.provider.getBalance(reserveInstance.target);
        
        // 남은 GAST가 SELL_BATCH_SIZE보다 작으면 남은 수량만큼만 판매
        let sellAmount = totalSupply < SELL_BATCH_SIZE ? totalSupply : SELL_BATCH_SIZE;

        if (sellerGastBalance < sellAmount) {
            console.log("❌ Seller has insufficient GAST. Adjusting sell amount.");
            sellAmount = sellerGastBalance; 
        }

        if (sellAmount <= 0) {
            console.log("🚫 No GAST left to sell or Reserve is empty.");
            break;
        }

        const initialReserveBalance = await ethers.provider.getBalance(reserveInstance.target);

        await exchange.connect(seller).sell(sellAmount);

        const finalReserveBalance = await ethers.provider.getBalance(reserveInstance.target);
        const withdrawnETH = initialReserveBalance - finalReserveBalance;
        totalWithdrawnETH += withdrawnETH;

        console.log(`🔹 Iteration ${i}: Sold ${sellAmount} GAST`);
        console.log(`🔍 Current total supply: ${await gasToken.totalSupply()}`);
        console.log(`🏦 Reserve ETH Balance: ${ethers.formatEther(finalReserveBalance)} ETH`);
        console.log(`💰 Treasury ETH Balance: ${ethers.formatEther(await ethers.provider.getBalance(treasuryInstance.target))} ETH`);
        console.log(`💸 Withdrawn ETH in this iteration: ${ethers.formatEther(withdrawnETH)} ETH`);
        console.log(`👤 Seller GAST Balance: ${sellerGastBalance.toString()} → ${(await gasToken.balanceOf(seller.address)).toString()}`);
        console.log(`💰 Total Withdrawn ETH so far: ${ethers.formatEther(totalWithdrawnETH)} ETH`);

        // 전체 공급량이 0이 되면 종료
        if (await gasToken.totalSupply() <= 0) {
            console.log("🎯 ------------------------------------------");
            console.log("🎯 | All GAST has been sold. Stopping loop.  |");
            console.log("🎯 ------------------------------------------");
            break;
        }

        // // Seller의 GAST 보유량이 0이 되면 종료
        if (sellerGastBalance <= 0) {
            console.log("❌ Seller has no more GAST to sell. Stopping loop.");
            break;
        }
    }
}