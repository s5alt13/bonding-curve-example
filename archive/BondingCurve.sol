// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
// NOTE: 반복문을 이용한 보간 -> lower, upper로 찾는 것으로 변경
import "./BondingCurveData.sol";
import "./GASToken.sol";
import "hardhat/console.sol"; 


contract BondingCurve {
    GASToken public gasToken; 
    // 본딩 커브 테이블 단위
    uint256 public constant UNIT_STEP = 2000;

    constructor(address _gasToken) {
        require(_gasToken != address(0), "Invalid GASToken address");
        gasToken = GASToken(_gasToken);
    }

    function getBuyPrice() external view returns (uint256 buyPrice) {
        console.log("Contract: BondingCurve | Function: getBuyPrice() | Sender:", msg.sender);

        uint256 currentSupply = gasToken.totalSupply();
        (buyPrice, , ) = interpolatePrice(currentSupply);

        return buyPrice;
    }

    function getSellPrice() external view returns (uint256 sellPrice) {
        console.log("Contract: BondingCurve | Function: getSellPrice() | Sender:", msg.sender);
  
        uint256 currentSupply = gasToken.totalSupply();
        ( , sellPrice, ) = interpolatePrice(currentSupply);

        return sellPrice;
    }

    function getSpread() external view returns (uint256 spread) {
        console.log("Contract: BondingCurve | Function: getSpread() | Sender:", msg.sender);

        uint256 currentSupply = gasToken.totalSupply();
        ( , , spread) = interpolatePrice(currentSupply);

        return spread;
    }

    function interpolatePrice(uint256 supply) internal pure returns (uint256 buyPrice, uint256 sellPrice, uint256 spread) {
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
            console.log("   - cumulativeSupply:", firstData.cumulativeSupply);
            console.log("   - buyPrice:", firstData.buyPrice);
            console.log("   - sellPrice:", firstData.sellPrice);
            console.log("   - spread:", firstData.spread);
            return (firstData.buyPrice, firstData.sellPrice, firstData.spread);
        }

        // 🔍 현재 발행량(supply)과 가장 가까운 본딩 커브 데이터 찾기
        for (uint256 i = 0; i < BondingCurveData.TABLE_SIZE; i++) {
            BondingCurveData.PriceData memory data = BondingCurveData.getData(i);
            
            // 🔍 디버깅: getData(i) 호출 후 반환된 값 확인
            console.log(" [DEBUG] getData() - Index:", i);
            // console.log("cumulativeSupply:", data.cumulativeSupply);
            // console.log("buyPrice:", data.buyPrice);
            // console.log("sellPrice:", data.sellPrice);
            // console.log("spread:", data.spread);

            if (data.cumulativeSupply > supply) {
                upperSupply = data.cumulativeSupply;
                upperData = data;
                break;
            }
            lowerSupply = data.cumulativeSupply;
            lowerData = data;
        }

        // ✅ lowerSupply가 없으면 첫 번째 행의 데이터로 설정
        if (lowerSupply == 0) {
            lowerData = BondingCurveData.getData(0);
            lowerSupply = lowerData.cumulativeSupply;
        }
        if (supply == lowerSupply) {
            console.log(" [DEBUG] No interpolation needed. Returning lowerData directly.");
            console.log("   - cumulativeSupply:", lowerData.cumulativeSupply);
            console.log("   - buyPrice:", lowerData.buyPrice);
            console.log("   - sellPrice:", lowerData.sellPrice);
            console.log("   - spread:", lowerData.spread);
            return (lowerData.buyPrice, lowerData.sellPrice, lowerData.spread);
        }
        
        // 1️⃣ 비율 (ratio) 계산
        uint256 ratio = (supply - lowerSupply) * 1e18 / (upperSupply - lowerSupply);
        uint256 adjustedRatio = ratio / 1e12;  
        console.log(" [DEBUG] Step 1 - Ratio calculated:", adjustedRatio);

        // 2️⃣ 구매 가격 (buyPrice) 보간
        buyPrice = lowerData.buyPrice + ((upperData.buyPrice - lowerData.buyPrice) * adjustedRatio / 1e18);
        console.log(" [DEBUG] Step 2 - Buy Price interpolated:", buyPrice);

        // 3️⃣ 판매 가격 (sellPrice) 보간
        sellPrice = lowerData.sellPrice + ((upperData.sellPrice - lowerData.sellPrice) * adjustedRatio / 1e18);
        console.log(" [DEBUG] Step 3 - Sell Price interpolated:", sellPrice);

        // 4️⃣ 스프레드 (spread) 계산 전 디버깅 로그
        console.log(" [DEBUG] Step 4 - Spread Calculation");

        // 5️⃣ 스프레드 (spread) 보간
        spread = lowerData.spread - ((lowerData.spread - upperData.spread) * adjustedRatio / 1e6);
        console.log(" [DEBUG] Step 5 - Spread interpolated:", spread);
        console.log("   - buyPrice:", buyPrice);
        console.log("   - sellPrice:", sellPrice);
        console.log("   - spread:", spread);
        console.log("Contract: BondingCurve - END | Function: interpolatePrice()");
    }

}