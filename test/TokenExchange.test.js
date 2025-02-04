const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenExchange Contract", function () {
    let tokenExchange, reserve, gasToken, treasury, bondingCurve;
    let owner, addr1, addr2;

    beforeEach(async function () {
        [owner, addr1, addr2, rebalancer] = await ethers.getSigners();
    
        console.log("🚀 Deploying Mock Reserve contract...");
        const ReserveMock = await ethers.getContractFactory("Reserve");
        reserve = await ReserveMock.deploy();
        await reserve.waitForDeployment();
        const reserveAddress = await reserve.getAddress();
        console.log("✅ Reserve deployed at:", reserveAddress);
    
        console.log("🚀 Deploying Mock GASToken contract...");
        const GASTokenMock = await ethers.getContractFactory("GASToken");
        gasToken = await GASTokenMock.deploy();
        await gasToken.waitForDeployment();
        const gasTokenAddress = await gasToken.getAddress();
        console.log("✅ GASToken deployed at:", gasTokenAddress);
    
        console.log("🚀 Deploying Mock BondingCurve contract...");
        const BondingCurveMock = await ethers.getContractFactory("BondingCurve");
        bondingCurve = await BondingCurveMock.deploy();
        await bondingCurve.waitForDeployment();
        const bondingCurveAddress = await bondingCurve.getAddress();
        console.log("✅ BondingCurve deployed at:", bondingCurveAddress);
    
        console.log("🚀 Deploying Treasury contract with temporary Exchange address...");
        const TreasuryContract = await ethers.getContractFactory("Treasury");
        treasury = await TreasuryContract.deploy(reserveAddress, gasTokenAddress, ethers.ZeroAddress, 10);
        await treasury.waitForDeployment();
        const treasuryAddress = await treasury.getAddress();
        console.log("✅ Treasury deployed at:", treasuryAddress);
    
        console.log("🚀 Deploying TokenExchange contract...");
        const TokenExchangeMock = await ethers.getContractFactory("TokenExchange");
        tokenExchange = await TokenExchangeMock.deploy(
            reserveAddress,
            gasTokenAddress,
            treasuryAddress,
            bondingCurveAddress
        );
        await tokenExchange.waitForDeployment();
        const exchangeAddress = await tokenExchange.getAddress();
        console.log("✅ TokenExchange deployed at:", exchangeAddress);
    
        console.log("🔄 Updating Treasury with correct Exchange address...");
        const tx = await treasury.connect(owner).updateExchange(exchangeAddress);
        await tx.wait();
        console.log("✅ Treasury updated with TokenExchange address.");
    });
    
    /** ✅ 기본 배포 테스트 */
    it("should deploy with correct initial settings", async function () {
        expect(await treasury.exchange()).to.equal(exchangeAddress);
        expect(await tokenExchange.reserve()).to.equal(await reserve.getAddress());
        expect(await tokenExchange.gasToken()).to.equal(await gasToken.getAddress());
        expect(await tokenExchange.treasury()).to.equal(await treasury.getAddress());
        expect(await tokenExchange.bondingCurve()).to.equal(await bondingCurve.getAddress());
    });

    // /** ✅ buy() 함수 테스트 */
    // it("should allow buying GAST tokens with ETH", async function () {
    //     const buyAmount = ethers.parseEther("1");

    //     console.log("🔍 Calling buy() with:", buyAmount.toString());
    //     await expect(tokenExchange.connect(addr1).buy({ value: buyAmount }))
    //         .to.emit(tokenExchange, "Buy")
    //         .withArgs(addr1.address, buyAmount, anyValue);

    //     console.log("✅ Buy transaction successful.");
    // });

    // /** ✅ sell() 함수 테스트 */
    // it("should allow selling GAST tokens for ETH", async function () {
    //     const sellAmount = ethers.parseEther("10");

    //     // ✅ Exchange를 통해 GAST 발행 후 판매
    //     await tokenExchange.connect(owner).mintForTesting(addr1.address, sellAmount);
    //     await gasToken.connect(addr1).approve(await tokenExchange.getAddress(), sellAmount);

    //     console.log("🔍 Calling sell() with:", sellAmount.toString());
    //     await expect(tokenExchange.connect(addr1).sell(sellAmount))
    //         .to.emit(tokenExchange, "Sell")
    //         .withArgs(addr1.address, sellAmount, anyValue);

    //     console.log("✅ Sell transaction successful.");
    // });

    // /** ✅ onlyExchange 수정자 테스트 */
    // it("should allow only exchange to call reserve deposit", async function () {
    //     await expect(reserve.connect(addr1).deposit({ value: ethers.parseEther("1") }))
    //         .to.be.revertedWith("Reserve: caller is not the exchange");
    // });

    // /** ✅ onlyOwner 수정자 테스트 */
    // it("should allow only owner to update contract settings", async function () {
    //     await expect(tokenExchange.connect(addr1).updateExchange(addr2.address))
    //         .to.be.revertedWith("Ownable: caller is not the owner");

    //     await tokenExchange.connect(owner).updateExchange(await treasury.getAddress());
    //     expect(await tokenExchange.treasury()).to.equal(await treasury.getAddress());
    // });
});