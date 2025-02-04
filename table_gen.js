const fs = require("fs");
const path = require("path");

// CSV 파일 경로
const CSV_FILE_PATH = "data.csv"; 
const OUTPUT_SOL_PATH = "BondingCurveData.sol"; 

// Solidity 라이브러리 헤더
const SOL_HEADER = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library BondingCurveData {
    struct PriceData {
        uint256 ethAmount;
        uint256 buyPrice;
        uint256 sellPrice;
        uint256 spread;
    }

    function getData(uint256 index) external pure returns (PriceData memory) {
        PriceData[1000] memory data = [
`;

// CSV 데이터를 Solidity 배열로 변환
function convertCSVtoSolidity() {
    const csvData = fs.readFileSync(CSV_FILE_PATH, "utf-8").trim().split("\n");
    let solidityArray = csvData
        .map((line) => {
            const [ethAmount, buyPrice, sellPrice, spread] = line.split(",");
            return `        PriceData(${ethAmount}, ${buyPrice}, ${sellPrice}, ${spread})`;
        })
        .join(",\n");

    const SOL_FOOTER = `
        ];
        return data[index];
    }
}`;

    fs.writeFileSync(OUTPUT_SOL_PATH, SOL_HEADER + solidityArray + SOL_FOOTER);
    console.log(`✅ Solidity 파일 생성 완료: ${OUTPUT_SOL_PATH}`);
}

// 실행
convertCSVtoSolidity();