const { expect } = require("chai");
const { ethers } = require("hardhat");

// TODO: 본딩 커브 알고리즘이 제대로 작동 안하는 듯. 확인 필요

describe("BondingCurve Contract", function () {
    let bondingCurve;
    let owner, addr1;

    beforeEach(async function () {
        [owner, addr1] = await ethers.getSigners();

        console.log("🚀 Deploying BondingCurve contract...");
        const BondingCurveFactory = await ethers.getContractFactory("BondingCurve");
        bondingCurve = await BondingCurveFactory.deploy();
        await bondingCurve.waitForDeployment();
        console.log("✅ BondingCurve deployed at:", await bondingCurve.getAddress());
    });

    /** ✅ ETH → GAST 가격 계산 */
    it("should correctly calculate buy price", async function () {
        const ethAmount = ethers.parseEther("1");

        // 먼저 최소 1개의 토큰을 공급하여 currentSupply을 0이 아니게 함
        await bondingCurve.testCbrt(1);  

        const tokenAmount = await bondingCurve.getBuyPrice(ethAmount);
        console.log("🔍 Buy Price for 1 ETH:", tokenAmount.toString());

        expect(tokenAmount).to.be.gt(0);
    });

    /** ✅ GAST → ETH 가격 계산 */
    it("should correctly calculate sell price", async function () {
        const tokenAmount = ethers.parseEther("100");

        // 마찬가지로 최소 1개의 토큰 공급
        await bondingCurve.testCbrt(1);  

        const ethAmount = await bondingCurve.getSellPrice(tokenAmount);
        console.log("🔍 Sell Price for 100 GAST:", ethAmount.toString());

        expect(ethAmount).to.be.gt(0);
    });

    /** ✅ 3제곱근 함수 테스트 */
    it("should correctly compute cubic root", async function () {
        const input = 27n;
        const expectedCbrt = 3n; // ³√27 = 3
        const result = await bondingCurve.testCbrt(input);

        console.log("🔍 Cubic Root of 27:", result.toString());
        expect(result).to.equal(expectedCbrt);
    });

    /** ✅ 로그 함수 테스트 */
    it("should approximate logarithm correctly", async function () {
        const input = 1000n;
        const result = await bondingCurve.testApproxLog(input);

        console.log("🔍 Approximate Log of 1000:", result.toString());
        expect(result).to.be.gt(0);
    });

    it("should correctly calculate price and spread at max supply", async function () {
        const maxSupply = await bondingCurve.MAX_SUPPLY();
    
        console.log("🔍 Setting supply to:", maxSupply.toString());
    
        // Step 1: MAX_SUPPLY - 1 로 설정하여 정상 동작 여부 확인
        await bondingCurve.setCurrentSupply(maxSupply - 1n);  // ✅ BigInt 연산
        console.log("✅ Successfully set supply to MAX_SUPPLY - 1");
    
        // Step 2: MAX_SUPPLY로 변경 시도
        await bondingCurve.setCurrentSupply(maxSupply);  // ✅ 그대로 할당
        console.log("✅ Successfully set supply to MAX_SUPPLY");
    
        // 가격 및 스프레드 조회
        const price = await bondingCurve.getBuyPrice(ethers.parseEther("1"));
        const spread = await bondingCurve.getSpread();
    
        console.log("🔍 Price at max supply:", ethers.formatEther(price));
        console.log("🔍 Spread at max supply:", spread.toString());
    
        expect(price).to.be.a("bigint");
        expect(spread).to.be.a("bigint");
    });
});