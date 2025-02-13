const fs = require("fs");
const path = require("path");

// CSV 파일 경로
const CSV_FILE_PATH = "data_2000.csv"; 
const OUTPUT_SOL_PATH = "BondingCurveData.sol"; 

// CSV 데이터 읽기
const csvData = fs.readFileSync(CSV_FILE_PATH, "utf-8").trim().split("\n");

// 배열 크기 자동 설정NN
const arraySize = csvData.length - 2;

// **배열 크기 제한 (Solidity 한도 고려)**
const MAX_ARRAY_SIZE = 6000;
if (arraySize > MAX_ARRAY_SIZE) {
    console.warn(`⚠️ 경고: 배열 크기 (${arraySize})가 너무 큽니다! 컴파일 오류 가능성 있음.`);
}

// Solidity 라이브러리 헤더
const SOL_HEADER = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library BondingCurveData {
    struct PriceData {
        uint256 cumulativeSupply;
        uint256 buyPrice;
        uint256 sellPrice;
        uint256 spread;
    }

    function getData(uint256 index) external pure returns (PriceData memory) {
        PriceData[${arraySize}] memory data = [
`;

// // CSV 데이터를 Solidity 배열로 변환 (고정 소수점 변환 적용)
let solidityArray = csvData
    .slice(2) // 첫 번째 행(헤더) 제거
    .map((line) => {
        const columns = line.split(",");

        // 정수 변환을 위한 10^18 스케일링 (고정 소수점 방식)
        const scaleFactor = 1e18;

        // 각 값을 변환 (소수점 제거)
        const cumulativeSupply = Math.round(parseFloat(columns[3])); // "Cumulative Supply" 열 (index 3)
        const buyPrice = Math.round(parseFloat(columns[4]) * scaleFactor); // "Buy Price (ETH)" 열 (index 4)
        const sellPrice = Math.round(parseFloat(columns[6]) * scaleFactor); // "Sell Price (ETH)" 열 (index 6)
        const spread = Math.round(parseFloat(columns[5]) * scaleFactor); // "Spread" 열 (index 5)

        return `        PriceData(${cumulativeSupply}, ${buyPrice}, ${sellPrice}, ${spread})`;
    })
    .join(",\n");

// Solidity 파일 생성
const SOL_FOOTER = `
        ];
        return data[index];
    }
}`;

fs.writeFileSync(OUTPUT_SOL_PATH, SOL_HEADER + solidityArray + SOL_FOOTER);
console.log(`✅ Solidity 파일 생성 완료: ${OUTPUT_SOL_PATH} (배열 크기: ${arraySize})`);