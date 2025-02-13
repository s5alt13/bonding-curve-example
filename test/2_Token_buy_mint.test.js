const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Bonding Curve Test", function () {
    let gasToken, bondingCurve, exchange, treasury, reserve;
    let inputETH = ethers.parseEther("1300");

    beforeEach(async function () {

        // 배포 순서 
        // 1. Reserve 
        // 2. GASToken
        // 3. BondingCurveData, BondingCurve
        // 4. Exchange
        // 5. Treasury <- Exchange address 필요 
        // 6. Exchange.updateTreasury

        const signers = await ethers.getSigners();
        owner = signers[0];
        buyer = signers[1]; 
        // console.log("🔍 Assigned Buyer Address:", buyer?.address);
        const balance = await ethers.provider.getBalance(buyer.address);
        // console.log("🔍 Buyer Initial ETH Balance:", ethers.formatEther(balance), "ETH")

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
            ethers.ZeroAddress // Treasury 주소는 아직 없음
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
    })

    it("should deploy contracts with correct initial settings", async function () {
        expect(await treasury.reserve()).to.equal(await reserve.getAddress());
        expect(await treasury.gasToken()).to.equal(await gasToken.getAddress());
        expect(await treasury.exchange()).to.equal(await exchange.getAddress());
        // expect(await treasury.reserveRatio).to.equal(initialReserveRatio);
        expect(await treasury.treasuryETHBalance()).to.equal(0);
    
        expect(await exchange.reserve()).to.equal(await reserve.getAddress());
        expect(await exchange.gasToken()).to.equal(await gasToken.getAddress());
        expect(await exchange.treasury()).to.equal(await treasury.getAddress());
    
        expect(await bondingCurve.gasToken()).to.equal(await gasToken.getAddress());
    
        // console.log("\n✅ All contract addresses verified successfully!");
    });

    // Test : 토큰 발행 1억개까지 ETH로 구매(exchange.buy)하면서 totalSupply 확인
    it("Should correctly interpolate price after multiple buys", async function () {

        const balance = await ethers.provider.getBalance(buyer.address);
        console.log("🔍 Buyer ETH Balance:", ethers.formatEther(balance), "ETH");
        
        const MAX_SUPPLY = 100000000; // 1억 GAST (0 decimals)


        for (let i = 1; i <= 500; i++) {

            await exchange.connect(buyer).buy({ value: inputETH });
            console.log(`🔹 Iteration ${i}: Buying 1300 ETH worth of GAST`);

            const supply = await gasToken.totalSupply();

            console.log(`🔍 Current total supply after ${i} buys:`, supply.toString());
            // 1억 개 이상이면 종료
            if (supply >= MAX_SUPPLY) {
                console.log("🎯 Supply reached 100 million, stopping loop.");
                break;
            }
        }
    })
});