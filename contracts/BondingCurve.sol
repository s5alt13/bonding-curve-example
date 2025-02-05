// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./BondingCurveData.sol";
import "./GASToken.sol";


contract BondingCurve {
    GASToken public gasToken; // GASToken 참조 (ERC-20)
    
    constructor(address _gasToken) {
        require(_gasToken != address(0), "Invalid GASToken address");
        gasToken = GASToken(_gasToken);
    }


    function getBuyPrice() external view returns (uint256 buyPrice) { 
        uint256 currentSupply = gasToken.totalSupply(); // ✅ GASToken에서 현재 공급량 조회
        (buyPrice, , ) = interpolatePrice(currentSupply);

        return buyPrice;
    }


    function getSellPrice() external view returns (uint256 sellPrice) { 
        uint256 currentSupply = gasToken.totalSupply(); // ✅ GASToken에서 현재 공급량 조회
        (, sellPrice, ) = interpolatePrice(currentSupply); 

        return sellPrice;
    }

    function getSpread() external view returns (uint256 spread) { 
        uint256 currentSupply = gasToken.totalSupply(); // ✅ GASToken에서 현재 공급량 조회
        (,,spread) = interpolatePrice(currentSupply);

        return spread;
    }

    function interpolatePrice(uint256 supply) internal pure returns (uint256 buyPrice, uint256 sellPrice, uint256 spread) {
        uint256 lowerIndex = (supply / 100_000) * 100_000; // 발행량 기준으로 가장 가까운 작은 값
        uint256 upperIndex = lowerIndex + 100_000; // 발행량 기준으로 가장 가까운 큰 값

        if (supply % 100_000 == 0) {
            BondingCurveData.PriceData memory data = BondingCurveData.getData(lowerIndex);
            return (data.buyPrice, data.sellPrice, data.spread);
        } else {
            BondingCurveData.PriceData memory lowerData = BondingCurveData.getData(lowerIndex);
            BondingCurveData.PriceData memory upperData = BondingCurveData.getData(upperIndex);

            uint256 ratio = (supply - lowerIndex) * 1e18 / (upperIndex - lowerIndex); // 비율 계산 (소수점 보정)
            buyPrice = lowerData.buyPrice + ((upperData.buyPrice - lowerData.buyPrice) * ratio / 1e18);
            sellPrice = lowerData.sellPrice + ((upperData.sellPrice - lowerData.sellPrice) * ratio / 1e18);
            spread = lowerData.spread + ((upperData.spread - lowerData.spread) * ratio / 1e18);
        }
    }
}