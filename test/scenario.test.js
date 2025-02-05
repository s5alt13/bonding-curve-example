const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Bonding Curve Scenario", function () {
  let owner, buyer;
  let gasToken, exchange, reserve, treasury, bondingCurve;
  const initialReserveRatio = 10; // 10%

  beforeEach(async function () {
      [owner, buyer] = await ethers.getSigners();

      console.log("\n🚀 Deploying Mock Reserve contract...");
      const ReserveMock = await ethers.getContractFactory("Reserve");
      reserve = await ReserveMock.deploy();
      await reserve.waitForDeployment();
      console.log("✅ Reserve deployed at:", await reserve.getAddress());

      console.log("\n🚀 Deploying Mock GASToken contract...");
      const GASTokenMock = await ethers.getContractFactory("GASToken");
      gasToken = await GASTokenMock.deploy();
      await gasToken.waitForDeployment();
      console.log("✅ GASToken deployed at:", await gasToken.getAddress());

      console.log("\n🚀 Deploying BondingCurveData library...");
      const BondingCurveDataLib = await ethers.getContractFactory("BondingCurveData");
      const bondingCurveData = await BondingCurveDataLib.deploy();
      await bondingCurveData.waitForDeployment();
      const bondingCurveDataAddress = await bondingCurveData.getAddress();
      console.log("✅ BondingCurveData deployed at:", bondingCurveDataAddress);

      console.log("\n🚀 Deploying BondingCurve contract (with library linking)...");
      const BondingCurveFactory = await ethers.getContractFactory("BondingCurve", {
          libraries: {
              BondingCurveData: bondingCurveDataAddress, // ✅ 라이브러리 주소 링크
          },
      });
      bondingCurve = await BondingCurveFactory.deploy(gasToken.getAddress());
      await bondingCurve.waitForDeployment();
      console.log("✅ BondingCurve deployed at:", await bondingCurve.getAddress());

      console.log("\n🚀 Deploying Mock TokenExchange contract...");
      const TokenExchangeMock = await ethers.getContractFactory("TokenExchange");
      exchange = await TokenExchangeMock.deploy(
          bondingCurve.getAddress(),
          gasToken.getAddress(),
          reserve.getAddress(),
          ethers.ZeroAddress // Treasury 주소는 아직 없음
      );
      await exchange.waitForDeployment();
      console.log("✅ TokenExchange deployed at:", await exchange.getAddress());

      console.log("\n🚀 Deploying Mock Treasury contract...");
      const TreasuryMock = await ethers.getContractFactory("Treasury");
      treasury = await TreasuryMock.deploy(
          reserve.getAddress(),
          gasToken.getAddress(),
          exchange.getAddress(),
          10
      );
      await treasury.waitForDeployment();
      console.log("✅ Treasury deployed at:", await treasury.getAddress());

      // ✅ Exchange 컨트랙트에 Treasury 주소 업데이트
      await exchange.updateTreasury(treasury.getAddress());
      console.log("🔄 Exchange Treasury address updated!");
  });

    /** ✅ 배포가 올바르게 되었는지 확인 */
    it("should deploy contracts with correct initial settings", async function () {
      expect(await treasury.reserve()).to.equal(await reserve.getAddress());
      expect(await treasury.gastToken()).to.equal(await gasToken.getAddress());
      expect(await treasury.exchange()).to.equal(await exchange.getAddress());
      expect(await treasury.reserveRatio()).to.equal(initialReserveRatio);
      expect(await treasury.treasuryETHBalance()).to.equal(0);

      expect(await exchange.reserve()).to.equal(await reserve.getAddress());
      expect(await exchange.gasToken()).to.equal(await gasToken.getAddress());
      expect(await exchange.treasury()).to.equal(await treasury.getAddress());

      expect(await bondingCurve.gasToken()).to.equal(await gasToken.getAddress());

      console.log("\n✅ All contract addresses verified successfully!");
  });

  // it("Buy 실행 시 Reserve와 Treasury 분배를 시뮬레이션", async function () {
  //   let totalSupply = await gasToken.totalSupply();

  //   while (totalSupply < MAX_SUPPLY) {
  //     // ✅ 1️⃣ 1000 ~ 5000 사이 500 단위 랜덤 ETH 생성
  //     let ethAmount = ethers.parseEther((Math.floor(Math.random() * 9) * 500 + 1000).toString());

  //     // ✅ 2️⃣ Exchange를 통해 buy 실행 (ETH 전송)
  //     await exchange.connect(buyer).buy({ value: ethAmount });

  //     // ✅ 3️⃣ 현재 상태 체크
  //     totalSupply = await gasToken.totalSupply();
  //     let reserveBalance = await provider.getBalance(reserve.getAddress());
  //     let treasuryBalance = await provider.getBalance(treasury.getAddress());

  //     // ✅ 4️⃣ 로그 출력 (테스트 실행 시 확인 가능)
  //     console.log(`\n🔹 Buy: ${ethers.formatEther(ethAmount)} ETH`);
  //     console.log(`📌 Total Supply: ${ethers.formatEther(totalSupply)} GAST`);
  //     console.log(`💰 Reserve Balance: ${ethers.formatEther(reserveBalance)} ETH`);
  //     console.log(`🏦 Treasury Balance: ${ethers.formatEther(treasuryBalance)} ETH`);

  //     // ✅ 5️⃣ 최대 공급량 도달 시 종료
  //     if (totalSupply >= MAX_SUPPLY) {
  //       console.log("\n🚀 Max supply reached! Simulation ended.");
  //       break;
  //     }
  //   }
  // });
});