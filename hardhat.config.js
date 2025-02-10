require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28", // 원하는 solc 버전 명시
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true, // ✅ 컨트랙트 크기 제한 해제
      gas: 30_000_000, // ✅ 가스 리밋 증가
      blockGasLimit: 999999999999999, // ✅ 블록 가스 한도 무제한 설정 (테스트용)
      accounts: {
        // count: 10, // 기본 10개 계정 생성
        // initialBalance: "2000000000000000000000000", // 100만 ETH (1e24 wei) ✅ 쉼표 추가
      },
      // accounts: [
      //   {
      //     privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
      //     balance: "1000000000000000000000000", // ✅ 100만 ETH (wei 단위)
      //   },
      // ],
    },
  },
  external: {
    contracts: ["./node_modules/@prb/math/contracts"],
  },
};

// console.log("🔍 Hardhat Network Initial Balance:", module.exports.networks.hardhat.accounts.initialBalance);
// console.log("🔍 Hardhat Gas Limit:", module.exports.networks.hardhat.gas);