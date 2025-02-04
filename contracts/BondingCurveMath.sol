// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

/// @title BondingCurve
/// @notice Manages bonding curve data and provides buy/sell price and spread calculations
contract BondingCurve {
    using Math for uint256;
    using SafeCast for uint256;
    // NOTE: 테스트용 이벤트
    event LogMaxSupply(uint256 maxSupply, uint256 requestedSupply);

    // Constants for bonding curve calculation
    uint256 public constant INITIAL_PRICE = 1e14; // 0.0001 ETH in wei
    uint256 public constant SLOPE = 1e12; // 0.000001 ETH in wei
    uint256 public constant SUPPLY_EXPONENT = 3; // Cubic root
    uint256 public constant WEIGHT_LOG_MULTIPLIER = 3250; // 32.5 * 100 (scaled)
    uint256 public constant WEIGHT_LOG_DENOMINATOR = 1e8; // 100,000,000

    // Spread constants
    uint256 public constant MAX_SPREAD_BPS = 9000; // 90% (basis points)
    uint256 public constant MIN_SPREAD_BPS = 1000; // 10% (basis points)
    uint256 public constant MAX_SUPPLY = 1e8; // Maximum token supply: 100 million

    // Current supply of the token
    uint256 public currentSupply;

    // note: getBuyPrice, getSellPrice, getSpread가 외부에서 호출될 일이 없다면 internal로 변경하고
    // 각각 현재 가격과 스프레드를 조회할 수 있는 별도의 함수를 구현해서 external view로 제공

    /// @notice Calculates the buy price for a given ETH amount based on current supply
    /// @param ethAmount The amount of ETH sent by the buyer
    /// @return tokenAmount The equivalent amount of GAST tokens
    function getBuyPrice(uint256 ethAmount) external view returns (uint256 tokenAmount) {
        require(ethAmount > 0, "ETH amount must be greater than 0");

        uint256 price = _calculatePrice(currentSupply);
        tokenAmount = (ethAmount * 1e18) / price; // Convert price to tokens (1e18 for decimals)
    }

    /// @notice Calculates the sell price for a given token amount based on current supply
    /// @param tokenAmount The amount of GAST tokens the user wants to sell
    /// @return ethAmount The equivalent ETH amount returned to the seller
    function getSellPrice(uint256 tokenAmount) external view returns (uint256 ethAmount) {
        require(tokenAmount > 0, "Token amount must be greater than 0");

        uint256 price = _calculatePrice(currentSupply);
        uint256 spreadAdjustedPrice = price.mulDiv(10000 - _calculateSpreadBps(), 10000); // Apply spread
        ethAmount = tokenAmount * spreadAdjustedPrice / 1e18; // Convert tokens to ETH
    }

    /// @notice Calculates the current spread based on the current supply
    /// @return spreadBps The spread in basis points (1-10000)
    function getSpread() external view returns (uint256 spreadBps) {
        spreadBps = _calculateSpreadBps();
    }

    /// @notice Approximate cubic root calculation for uint256
    /// @param x The input value
    /// @return result The cubic root of x
    /// _cbrt를 openzepplin에서 사용하지 않기 때문에 직접 구현함. (보안 검증 필요)
    function _cbrt(uint256 x) internal pure returns (uint256 result) {
        // Initial guess
        result = x;
        uint256 guess;

        // Newton-Raphson method for cubic root approximation
        while (true) {
            guess = (2 * result + x / (result * result)) / 3;
            if (guess >= result) {
                break;
            }
            result = guess;
        }
    }
    
    /// @notice Internal function to calculate the price based on current supply
    /// @param supply The current token supply
    /// @return price The calculated price in wei
    function _calculatePrice(uint256 supply) internal pure returns (uint256 price) {
        if (supply == 0) {
            return INITIAL_PRICE; // 공급량이 0일 때 기본 가격 반환
        }
        uint256 logTerm = WEIGHT_LOG_MULTIPLIER * _approxLog(1 + supply / WEIGHT_LOG_DENOMINATOR);
        uint256 exponentTerm = _cbrt(supply); // Use custom cubic root approximation
        price = INITIAL_PRICE + (SLOPE * logTerm * exponentTerm) / 1e18;
    }

    /// @notice Internal function to calculate the spread based on current supply
    /// @return spreadBps The spread in basis points (1-10000)
    function _calculateSpreadBps() internal view returns (uint256 spreadBps) {
        uint256 progress = currentSupply * 10000 / MAX_SUPPLY; // Percentage progress in basis points
        spreadBps = MAX_SPREAD_BPS - progress * (MAX_SPREAD_BPS - MIN_SPREAD_BPS) / 10000;
    }

    /// @notice Simple logarithm function approximation
    /// @param x The input value
    /// @return result The natural logarithm (approximate) scaled by 1e18
    function _approxLog(uint256 x) internal pure returns (uint256 result) {
        require(x > 0, "Logarithm input must be greater than 0");

        // Approximation of ln(x) using iterative methods
        // Scale x to avoid underflow/overflow
        uint256 scaledX = x * 1e10; // Scale up to reduce error
        result = scaledX / 2; // Placeholder for actual approximation
    }

    /// @notice 테스트를 위한 cubic root 헬퍼 함수
    function testCbrt(uint256 x) external pure returns (uint256) {
        return _cbrt(x);
    }

    /// @notice 테스트를 위한 logarithm 헬퍼 함수
    function testApproxLog(uint256 x) external pure returns (uint256) {
        return _approxLog(x);
    }
    // TODO: 테스트를 위해 발행량을 임의로 조절하기 위해 추가한 함수.
    function setCurrentSupply(uint256 _supply) public {
        require(_supply <= MAX_SUPPLY, "Exceeds max supply");
        emit LogMaxSupply(MAX_SUPPLY, _supply); // 디버깅용 로그 추가
        currentSupply = _supply;
    }
}