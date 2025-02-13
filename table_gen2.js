const fs = require("fs");

// CSV 파일 경로 (100 ETH 단위 데이터 사용)
const CSV_FILE_PATH = "data_10.csv";
const OUTPUT_SOL_PATH = "BondingCurveData.sol";

// 50만 개 단위로 선택
const TOKEN_STEP = 500000;

// CSV 데이터 읽기
const csvData = fs.readFileSync(CSV_FILE_PATH, "utf-8").trim().split("\n");

// 첫 번째 줄(헤더) 제거 후 파싱
const parsedData = csvData.slice(1).map(line => {
    const columns = line.split(",");
    return {
        ethInput: parseFloat(columns[1]), // ETH 입력량
        issuedTokens: parseFloat(columns[2]), // 새로 발행된 토큰
        cumulativeSupply: parseFloat(columns[3]), // 누적 공급량
        buyPrice: parseFloat(columns[4]), // 구매 가격 (ETH)
        sellPrice: parseFloat(columns[6]), // 판매 가격 (ETH)
        spread: parseFloat(columns[5]) // 스프레드
    };
});

// 50만 개 단위로 가장 가까운 값 찾기
let targetSupply = TOKEN_STEP;
let selectedData = [];

for (let i = 0; i < parsedData.length; i++) {
    if (parsedData[i].cumulativeSupply >= targetSupply) {
        // 이전 행을 선택 (50만 개를 초과하기 전의 값)
        selectedData.push(parsedData[i - 1]);
        targetSupply += TOKEN_STEP;
    }
}

// Solidity 배열 생성
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
        PriceData[${selectedData.length}] memory data = [
`;

let solidityArray = selectedData.map((row) => {
    const scaleFactor = 1e18;
    return `        PriceData(${Math.round(row.cumulativeSupply)}, ${Math.round(row.buyPrice * scaleFactor)}, ${Math.round(row.sellPrice * scaleFactor)}, ${Math.round(row.spread * scaleFactor)})`;
}).join(",\n");

const SOL_FOOTER = `
        ];
        return data[index];
    }
}`;

fs.writeFileSync(OUTPUT_SOL_PATH, SOL_HEADER + solidityArray + SOL_FOOTER);
console.log(`✅ Solidity 파일 생성 완료: ${OUTPUT_SOL_PATH} (배열 크기: ${selectedData.length})`);