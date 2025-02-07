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

    function getBuyPrice() external returns (uint256 buyPrice) {
        console.log("Contract: BondingCurve | Function: getBuyPrice() | Sender:", msg.sender);

        uint256 currentSupply = gasToken.totalSupply();
        (buyPrice, , ) = interpolatePrice(currentSupply);

        return buyPrice;
    }

    function getSellPrice() external returns (uint256 sellPrice) {
        console.log("Contract: BondingCurve | Function: getSellPrice() | Sender:", msg.sender);
  
        uint256 currentSupply = gasToken.totalSupply();
        ( , sellPrice, ) = interpolatePrice(currentSupply);

        return sellPrice;
    }

    function getSpread() external returns (uint256 spread) {
        console.log("Contract: BondingCurve | Function: getSpread() | Sender:", msg.sender);

        uint256 currentSupply = gasToken.totalSupply();
        ( , , spread) = interpolatePrice(currentSupply);

        return spread;
    }

    function interpolatePrice(uint256 supply) internal returns (uint256 buyPrice, uint256 sellPrice, uint256 spread) {
        console.log("Contract: BondingCurve | Function: interpolatePrice()");
        console.log("Entry Function supply", supply);

        uint256 lowerSupply;
        uint256 upperSupply;
        BondingCurveData.PriceData memory lowerData;
        BondingCurveData.PriceData memory upperData;

        // ✅ 첫 번째 행의 발행량보다 supply가 적은 경우, 첫 번째 행의 데이터를 직접 반환
        if (supply < BondingCurveData.getData(0).cumulativeSupply) {
            BondingCurveData.PriceData memory firstData = BondingCurveData.getData(0);
            console.log("[INFO] Supply is below first row's cumulativeSupply. Returning first row data.");
            return (firstData.buyPrice, firstData.sellPrice, firstData.spread);
        }

        // 🔹 이전 저장된 lowerIndex, upperIndex를 사용하여 빠르게 탐색
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

        // ✅ lowerSupply가 정확히 일치하면 보간 없이 반환
        if (supply == lowerSupply) {
            console.log(" [DEBUG] No interpolation needed. Returning lowerData directly.");
            return (lowerData.buyPrice, lowerData.sellPrice, lowerData.spread);
        }

        // ✅ 보간할 데이터가 없는 경우 예외 처리
        require(upperSupply > lowerSupply, "Invalid supply range");

        // 🔍 디버깅 로그
        console.log(" [DEBUG] Final lowerSupply:", lowerSupply);
        console.log(" [DEBUG] Final upperSupply:", upperSupply);
        console.log(" [DEBUG] lowerData - buyPrice:", lowerData.buyPrice);
        console.log(" [DEBUG] upperData - buyPrice:", upperData.buyPrice);

        // 🔹 보간 계산
        uint256 ratio = (supply - lowerSupply) * 1e18 / (upperSupply - lowerSupply);
        uint256 adjustedRatio = ratio / 1e12;  

        buyPrice = lowerData.buyPrice + ((upperData.buyPrice - lowerData.buyPrice) * adjustedRatio / 1e18);
        sellPrice = lowerData.sellPrice + ((upperData.sellPrice - lowerData.sellPrice) * adjustedRatio / 1e18);
        spread = lowerData.spread - ((lowerData.spread - upperData.spread) * adjustedRatio / 1e6);

        console.log(" [DEBUG] Interpolated Buy Price:", buyPrice);
        console.log(" [DEBUG] Interpolated Sell Price:", sellPrice);
        console.log(" [DEBUG] Interpolated Spread:", spread);

        console.log("Contract: BondingCurve - END | Function: interpolatePrice()");
    }

}