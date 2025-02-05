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
    },
  },
};