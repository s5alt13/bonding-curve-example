// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./BondingCurveData.sol";
import "./GASToken.sol";
import "hardhat/console.sol"; 


contract BondingCurve {
    GASToken public gasToken; 
    // 본딩 커브 테이블 단위
    uint256 public constant UNIT_STEP = 2000;

    uint256 private lowerIndex = 0;
    uint256 private upperIndex = 1;

    constructor(address _gasToken) {
        require(_gasToken != address(0), "Invalid GASToken address");
        gasToken = GASToken(_gasToken);
    }

    function getBuyPrice() external returns (uint256 buyPrice, uint256 spread) {
        // console.log("Contract: BondingCurve | Function: getBuyPrice() | Sender:", msg.sender);

        uint256 currentSupply = gasToken.totalSupply();
        (buyPrice, , spread ) = interpolateBuyPrice(currentSupply);

        return (buyPrice, spread);
    }

    function getSellPrice() external returns (uint256 sellPrice) {
        console.log("Contract: BondingCurve | Function: getSellPrice() | Sender:", msg.sender);
  
        uint256 currentSupply = gasToken.totalSupply();
        sellPrice = interpolateSellPrice(currentSupply);

        return sellPrice;
    }

    // function getSpread() external returns (uint256 spread) {
    //     // console.log("Contract: BondingCurve | Function: getSpread() | Sender:", msg.sender);

    //     uint256 currentSupply = gasToken.totalSupply();
    //     ( , , spread) = interpolatePrice(currentSupply, false);

    //     return spread;
    // }

    // function interpolatePrice(uint256 supply, bool isBuy) internal returns (uint256 buyPrice, uint256 sellPrice, uint256 spread) {
    //     console.log("Contract: BondingCurve | Function: interpolatePrice()");
    //     console.log("Entry Function supply", supply);

    //     uint256 lowerSupply;
    //     uint256 upperSupply;
    //     BondingCurveData.PriceData memory lowerData;
    //     BondingCurveData.PriceData memory upperData;

    //     // ✅ 첫 번째 행의 발행량보다 supply가 적은 경우, 첫 번째 행의 데이터를 직접 반환
    //     if (supply < BondingCurveData.getData(0).cumulativeSupply) {
    //         BondingCurveData.PriceData memory firstData = BondingCurveData.getData(0);
    //         // console.log("[INFO] Supply is below first row's cumulativeSupply. Returning first row data.");
    //         return (firstData.buyPrice, firstData.sellPrice, firstData.spread);
    //     }

    //     // 🔹 이전 저장된 lowerIndex, upperIndex를 사용하여 빠르게 탐색
    //     if (isBuy) {
    //         while (supply < BondingCurveData.getData(lowerIndex).cumulativeSupply && lowerIndex > 0) {
    //             lowerIndex--; 
    //             upperIndex--;
    //         }
    //         while (supply > BondingCurveData.getData(upperIndex).cumulativeSupply && upperIndex < BondingCurveData.TABLE_SIZE - 1) {
    //             lowerIndex++;
    //             upperIndex++;
    //         }
    //     } else {
    //         while (supply > BondingCurveData.getData(upperIndex).cumulativeSupply && upperIndex > 0) {
    //             lowerIndex--;
    //             upperIndex--;
    //         }
    //         while (supply < BondingCurveData.getData(lowerIndex).cumulativeSupply && lowerIndex < BondingCurveData.TABLE_SIZE - 1) {
    //             lowerIndex++;
    //             upperIndex++;
    //         }
    //     }

    //     // ✅ lowerData, upperData 갱신
    //     lowerData = BondingCurveData.getData(lowerIndex);
    //     upperData = BondingCurveData.getData(upperIndex);
    //     lowerSupply = lowerData.cumulativeSupply;
    //     upperSupply = upperData.cumulativeSupply;

    //     // ✅ lowerSupply가 정확히 일치하면 보간 없이 반환
    //     if (supply == lowerSupply) {
    //         // console.log(" [DEBUG] No interpolation needed. Returning lowerData directly.");
    //         return (lowerData.buyPrice, lowerData.sellPrice, lowerData.spread);
    //     }

    //     // ✅ 보간할 데이터가 없는 경우 예외 처리
    //     require(upperSupply > lowerSupply, "Invalid supply range");

    //     // 🔍 디버깅 로그
    //     // console.log(" [DEBUG] Final lowerSupply:", lowerSupply);
    //     // console.log(" [DEBUG] Final upperSupply:", upperSupply);
    //     // console.log(" [DEBUG] lowerData - buyPrice:", lowerData.buyPrice);
    //     // console.log(" [DEBUG] upperData - buyPrice:", upperData.buyPrice);

    //     // 🔹 보간 계산
    //     uint256 ratio = (supply - lowerSupply) * 1e18 / (upperSupply - lowerSupply);
    //     uint256 adjustedRatio = ratio / 1e12;  

    //     buyPrice = lowerData.buyPrice + ((upperData.buyPrice - lowerData.buyPrice) * adjustedRatio / 1e18);
    //     sellPrice = lowerData.sellPrice + ((upperData.sellPrice - lowerData.sellPrice) * adjustedRatio / 1e18);
    //     spread = lowerData.spread - ((lowerData.spread - upperData.spread) * adjustedRatio / 1e6);

    //     // console.log(" [DEBUG] Interpolated Buy Price:", buyPrice);
    //     // console.log(" [DEBUG] Interpolated Sell Price:", sellPrice);
    //     // console.log(" [DEBUG] Interpolated Spread:", spread);

    //     // console.log("Contract: BondingCurve - END | Function: interpolatePrice()");
    // }

    function interpolateBuyPrice(uint256 supply) internal returns (uint256 buyPrice, uint256 sellPrice, uint256 spread) {
        console.log("Contract: BondingCurve | Function: interpolateBuyPrice()");
        console.log("Entry Function supply", supply);

        uint256 lowerSupply;
        uint256 upperSupply;
        BondingCurveData.PriceData memory lowerData;
        BondingCurveData.PriceData memory upperData;

        // ✅ 첫 번째 행의 공급량보다 작으면 첫 번째 데이터 반환
        if (supply < BondingCurveData.getData(0).cumulativeSupply) {
            BondingCurveData.PriceData memory firstData = BondingCurveData.getData(0);
            return (firstData.buyPrice, firstData.sellPrice, firstData.spread);
        }

        // 🔹 lowerIndex, upperIndex 탐색 (Buy 기준)
        while (supply < BondingCurveData.getData(lowerIndex).cumulativeSupply && lowerIndex > 0) {
            lowerIndex--; 
            upperIndex--;
        }
        while (supply > BondingCurveData.getData(upperIndex).cumulativeSupply && upperIndex < BondingCurveData.TABLE_SIZE - 1) {
            lowerIndex++;
            upperIndex++;
        }

        // ✅ lowerData, upperData 갱신
        lowerData = BondingCurveData.getData(lowerIndex);
        upperData = BondingCurveData.getData(upperIndex);
        lowerSupply = lowerData.cumulativeSupply;
        upperSupply = upperData.cumulativeSupply;

        // ✅ lowerSupply와 정확히 일치하면 바로 반환
        if (supply == lowerSupply) {
            return (lowerData.buyPrice, lowerData.sellPrice, lowerData.spread);
        }

        // ✅ 보간할 데이터가 없는 경우 예외 처리
        require(upperSupply > lowerSupply, "Invalid supply range");

        // 🔹 보간 계산
        uint256 ratio = (supply - lowerSupply) * 1e18 / (upperSupply - lowerSupply);
        uint256 adjustedRatio = ratio / 1e12;

        buyPrice = lowerData.buyPrice + ((upperData.buyPrice - lowerData.buyPrice) * adjustedRatio / 1e18);
        sellPrice = lowerData.sellPrice + ((upperData.sellPrice - lowerData.sellPrice) * adjustedRatio / 1e18);
        spread = lowerData.spread - ((lowerData.spread - upperData.spread) * adjustedRatio / 1e6);

        return (buyPrice, sellPrice, spread);
    }

    // function interpolateSellPrice(uint256 supply) internal returns (uint256 sellPrice) {
    //     console.log("Contract: BondingCurve | Function: interpolateSellPrice()");
    //     console.log("Entry Function supply", supply);

    //     uint256 lowerSupply;
    //     uint256 upperSupply;
    //     BondingCurveData.PriceData memory lowerData;
    //     BondingCurveData.PriceData memory upperData;

    //     uint256 lastIndex = BondingCurveData.TABLE_SIZE - 1;

    //     // ✅ 공급량이 마지막 행보다 크면 마지막 데이터를 반환
    //     if (supply >= BondingCurveData.getData(lastIndex).cumulativeSupply) {
    //         BondingCurveData.PriceData memory lastData = BondingCurveData.getData(lastIndex);
    //         console.log("[INFO] Supply is greater than or equal to the last row's cumulativeSupply");
    //         console.log("Supply:", supply);
    //         console.log("Last Row Cumulative Supply:", BondingCurveData.getData(lastIndex).cumulativeSupply);
    //         console.log("Returning Last Row Sell Price:", lastData.sellPrice);
    //         return lastData.sellPrice;
    //     }

    //     // ✅ 공급량이 첫 번째 행보다 작으면 첫 번째 데이터를 반환
    //     if (supply <= BondingCurveData.getData(0).cumulativeSupply) {
    //         BondingCurveData.PriceData memory firstData = BondingCurveData.getData(0);
    //         console.log("[INFO] Supply is less than or equal to the first row's cumulativeSupply");
    //         console.log("Supply:", supply);
    //         console.log("First Row Cumulative Supply:", BondingCurveData.getData(0).cumulativeSupply);
    //         console.log("Returning First Row Sell Price:", firstData.sellPrice);
    //         return firstData.sellPrice;
    //     }

    //     // 🔹 lowerIndex, upperIndex 탐색 (Sell 기준)
    //     while (lowerIndex > 0 && supply < BondingCurveData.getData(lowerIndex).cumulativeSupply) {
    //         lowerIndex--;
    //         upperIndex--;
    //     }
    //     while (upperIndex < lastIndex && supply > BondingCurveData.getData(upperIndex).cumulativeSupply) {
    //         lowerIndex++;
    //         upperIndex++;
    //     }

    //     // ✅ lowerData, upperData 갱신
    //     lowerData = BondingCurveData.getData(lowerIndex - 1);
    //     upperData = BondingCurveData.getData(upperIndex - 1);
    //     console.log("[DEBUG] Selected lowerIndex:", lowerIndex - 1);
    //     console.log("[DEBUG] Selected upperIndex:", upperIndex - 1);
    //     lowerSupply = lowerData.cumulativeSupply;
    //     upperSupply = upperData.cumulativeSupply;

    //     // ✅ lowerSupply와 정확히 일치하면 바로 반환
    //     if (supply == lowerSupply) {
    //         return lowerData.sellPrice;
    //     }

    //     // ✅ 예외 처리: upperSupply가 lowerSupply보다 커야 함
    //     require(upperSupply > lowerSupply, "Invalid supply range");

    //     // 🔹 보간 계산
    //     uint256 ratio = (supply - lowerSupply) * 1e18 / (upperSupply - lowerSupply);
    //     uint256 adjustedRatio = ratio / 1e12;

    //     // sellPrice = lowerData.sellPrice + ((upperData.sellPrice - lowerData.sellPrice) * adjustedRatio / 1e18);
    //     sellPrice = upperData.sellPrice - ((upperData.sellPrice - lowerData.sellPrice) * adjustedRatio / 1e18);

    //     console.log("SellPrice Calculation:");
    //     console.log("Lower Sell Price:", lowerData.sellPrice);
    //     console.log("Upper Sell Price:", upperData.sellPrice);
    //     console.log("Ratio:", adjustedRatio);
    //     console.log("Computed Sell Price:", sellPrice);
    //     // console.log("Computed Spread:", spread);

    //     return sellPrice;
    // }
    function interpolateSellPrice(uint256 supply) internal returns (uint256 sellPrice) {
        console.log("Contract: BondingCurve | Function: interpolateSellPrice()");
        console.log("Entry Function supply", supply);

        uint256 lowerSupply;
        uint256 upperSupply;
        BondingCurveData.PriceData memory lowerData;
        BondingCurveData.PriceData memory upperData;

        uint256 lastIndex = BondingCurveData.TABLE_SIZE - 1;

        // ✅ 공급량이 마지막 행보다 크면 마지막 데이터를 반환
        if (supply >= BondingCurveData.getData(lastIndex).cumulativeSupply) {
            BondingCurveData.PriceData memory lastData = BondingCurveData.getData(lastIndex);
            console.log("[INFO] Supply is greater than or equal to the last row's cumulativeSupply");
            console.log("Supply:", supply);
            console.log("Last Row Cumulative Supply:", lastData.cumulativeSupply);
            console.log("Returning Last Row Sell Price:", lastData.sellPrice);
            return lastData.sellPrice;
        }

        // ✅ 공급량이 첫 번째 행보다 작으면 첫 번째 데이터를 반환
        if (supply <= BondingCurveData.getData(0).cumulativeSupply) {
            BondingCurveData.PriceData memory firstData = BondingCurveData.getData(0);
            console.log("[INFO] Supply is less than or equal to the first row's cumulativeSupply");
            console.log("Supply:", supply);
            console.log("First Row Cumulative Supply:", firstData.cumulativeSupply);
            console.log("Returning First Row Sell Price:", firstData.sellPrice);
            return firstData.sellPrice;
        }

        // 🔹 lowerIndex, upperIndex 탐색 (Sell 기준) → underflow 방지
        while (lowerIndex > 0 && supply < BondingCurveData.getData(lowerIndex).cumulativeSupply) {
            lowerIndex--;
            if (upperIndex > 0) upperIndex--; // underflow 방지
        }
        while (upperIndex < lastIndex && supply > BondingCurveData.getData(upperIndex).cumulativeSupply) {
            if (lowerIndex < lastIndex) lowerIndex++; // overflow 방지
            upperIndex++;
        }

        // ✅ lowerData, upperData 갱신 (수정된 인덱스 적용)
        lowerData = BondingCurveData.getData(lowerIndex);
        upperData = BondingCurveData.getData(upperIndex);
        console.log("[DEBUG] Selected lowerIndex:", lowerIndex);
        console.log("[DEBUG] Selected upperIndex:", upperIndex);
        lowerSupply = lowerData.cumulativeSupply;
        upperSupply = upperData.cumulativeSupply;

        // ✅ lowerSupply와 정확히 일치하면 바로 반환
        if (supply == lowerSupply) {
            return lowerData.sellPrice;
        }

        // ✅ 예외 처리: upperSupply가 lowerSupply보다 커야 함
        require(upperSupply > lowerSupply, "Invalid supply range");

        // 🔹 보간 계산 (upperData 기준으로 보간)
        uint256 ratio = (supply - lowerSupply) * 1e18 / (upperSupply - lowerSupply);
        uint256 adjustedRatio = ratio / 1e12;

        sellPrice = upperData.sellPrice - ((upperData.sellPrice - lowerData.sellPrice) * adjustedRatio / 1e18);

        console.log("SellPrice Calculation:");
        console.log("Lower Sell Price:", lowerData.sellPrice);
        console.log("Upper Sell Price:", upperData.sellPrice);
        console.log("Ratio:", adjustedRatio);
        console.log("Computed Sell Price:", sellPrice);

        return sellPrice;
    }   
}