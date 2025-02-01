const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BondingCurveTable", function () {
    let BondingCurveTable;
    let bondingCurveTable;

    before(async function () {
        // Load the contract factory
        BondingCurveTable = await ethers.getContractFactory("BondingCurveTable");
    });

    beforeEach(async function () {
        // Deploy the contract before each test
        bondingCurveTable = await BondingCurveTable.deploy();
        await bondingCurveTable.deployed();
    });

    describe("getBuyPrice", function () {
        it("should return the correct token amount for a given ETH amount", async function () {
            const ethAmount = ethers.utils.parseEther("1"); // 1 ETH
            const tokenAmount = await bondingCurveTable.getBuyPrice(ethAmount);

            console.log("Token Amount for 1 ETH:", tokenAmount.toString());
            expect(tokenAmount).to.be.a("BigNumber");
        });
    });

    describe("getSellPrice", function () {
        it("should return the correct ETH amount for a given token amount", async function () {
            const tokenAmount = ethers.utils.parseUnits("1000", 18); // 1000 tokens
            const ethAmount = await bondingCurveTable.getSellPrice(tokenAmount);

            console.log("ETH Amount for 1000 tokens:", ethAmount.toString());
            expect(ethAmount).to.be.a("BigNumber");
        });
    });

    describe("getSpread", function () {
        it("should return the correct spread ratios for a given ETH amount", async function () {
            const ethAmount = ethers.utils.parseEther("1"); // 1 ETH
            const [reserveRatio, treasuryRatio] = await bondingCurveTable.getSpread(ethAmount);

            console.log("Reserve Ratio:", reserveRatio.toString());
            console.log("Treasury Ratio:", treasuryRatio.toString());
            expect(reserveRatio).to.be.a("BigNumber");
            expect(treasuryRatio).to.be.a("BigNumber");
        });
    });

    describe("_cbrt", function () {
        it("should return the correct cubic root for a given number", async function () {
            const number = ethers.BigNumber.from("1000000000000000000"); // 1e18
            const cubicRoot = await bondingCurveTable.testCbrt(number);

            console.log("Cubic Root of 1e18:", cubicRoot.toString());
            expect(cubicRoot).to.be.a("BigNumber");
        });
    });

    describe("_approxLog", function () {
        it("should return the correct approximate log for a given number", async function () {
            const number = ethers.BigNumber.from("1000000000000000000"); // 1e18
            const logResult = await bondingCurveTable.testApproxLog(number);

            console.log("Approx Log of 1e18:", logResult.toString());
            expect(logResult).to.be.a("BigNumber");
        });
    });
});