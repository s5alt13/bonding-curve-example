const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Bonding Curve Test", function () {
    let gasToken, bondingCurve, exchange, treasury, reserve;
    let initialETH = ethers.parseEther("100");

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
});