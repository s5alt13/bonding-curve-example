const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Bonding Curve Test", function () {
    let gasToken, bondingCurve, exchange, treasury, reserve;
    let initialETH = ethers.parseEther("1000");

    beforeEach(async function () {
        // 배포 순서 
        // 1. Reserve 
        // 2. GASToken
        // 3. BondingCurveData, BondingCurve
        // 4. Exchange
        // 5. Treasury <- Exchange address 필요 
        // 6. Exchange.updateTreasury

        const signers = await ethers.getSigners();
        console.log("🔍 Signers Length:", signers.length); // ✅ signers 배열 길이 체크
        owner = signers[0];
        buyer = signers[1]; // ✅ buyer를 명확하게 할당
        console.log("🔍 Assigned Buyer Address:", buyer?.address);
        // console.log("🔍 Buyer Address:", buyer.address); // ✅ buyer 주소 출력
        // const ownerBalance = await ethers.provider.getBalance(owner.address);
        // console.log(`🔍 Owner ETH Balance before sending: ${ethers.formatEther(ownerBalance)} ETH`);


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

    it("Should correctly interpolate price after multiple buys", async function () {
        // await owner.sendTransaction({
        //     to: buyer.address,
        //     value: ethers.parseEther("9000") 
        // });
        const balance = await ethers.provider.getBalance(buyer.address);
        console.log("🔍 Buyer ETH Balance:", ethers.formatEther(balance), "ETH");
        for (let i = 1; i <= 9; i++) {
            console.log(`🔹 Iteration ${i}: Buying 1000 ETH worth of GAST`);

            await exchange.connect(buyer).buy({ value: initialETH });

            const supply = await gasToken.totalSupply();
            console.log(`🔍 Current total supply after ${i} buys:`, supply.toString());
        }
    })
});