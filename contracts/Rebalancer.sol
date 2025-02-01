// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Treasury.sol";
import "./Reserve.sol";
import "./TokenExchange.sol";

contract Rebalancer is Ownable {
    Treasury public treasury; // Treasury contract reference
    Reserve public reserve; // Reserve contract refere`nce
    TokenExchange public exchange; // BondingCurveExchange contract reference
    BondingCurve public curve;

    uint256 public targetRTR; // Target Reserve-Treasury Ratio (e.g., 10% means 10)
    uint256 public tolerance; // Tolerance range for RTR (e.g., ±2%)

    event RebalanceTriggered(uint256 reserveBalance, uint256 treasuryBalance, uint256 targetRTR, bool withinBounds);
    event RebalancePerformed(uint256 ethUsed, uint256 gastPurchased);

    constructor(
        address _treasury,
        address payable _reserve, // TODO: 테스트용으로 payable 추후 삭제
        address _exchange,
        uint256 _targetRTR,
        uint256 _tolerance
    ) Ownable(msg.sender) { // 명시적으로 Ownable 생성자 호출
        require(_treasury != address(0), "Invalid Treasury address");
        require(_reserve != address(0), "Invalid Reserve address");
        require(_exchange != address(0), "Invalid Exchange address");

        treasury = Treasury(_treasury);
        reserve = Reserve(payable(_reserve));
        exchange = TokenExchange(payable(_exchange));
        targetRTR = _targetRTR;
        tolerance = _tolerance;
    }

    /**
     * @notice Check if the Reserve-Treasury Ratio (RTR) is within bounds
     * @return withinBounds True if RTR is within target ± tolerance
     */
    function checkRTR() public view returns (bool withinBounds) {
        uint256 reserveBalance = reserve.getBalance();
        uint256 treasuryBalance = treasury.treasuryETHBalance();

        if (treasuryBalance == 0) return false; // Avoid division by zero
        uint256 currentRTR = (reserveBalance * 100) / treasuryBalance;

        uint256 lowerBound = targetRTR > tolerance ? targetRTR - tolerance : 0;
        uint256 upperBound = targetRTR + tolerance;

        withinBounds = (currentRTR >= lowerBound && currentRTR <= upperBound);
    }

    /**
     * @notice Trigger the rebalancing process to align RTR with the target
     */
    function triggerRebalance() external onlyOwner {
        uint256 reserveBalance = reserve.getBalance();
        uint256 treasuryBalance = treasury.getBalance();

        require(treasuryBalance > 0, "Treasury balance is zero");

        uint256 currentRTR = (reserveBalance * 100) / treasuryBalance;

        // Check if rebalancing is needed
        if (checkRTR()) {
            emit RebalanceTriggered(reserveBalance, treasuryBalance, targetRTR, true);
            return; // RTR is already within bounds
        }

        emit RebalanceTriggered(reserveBalance, treasuryBalance, targetRTR, false);

        // Perform rebalancing: adjust ETH in Treasury to align RTR with target
        if (currentRTR < targetRTR) {
            // Treasury needs to purchase GAST using its ETH
            uint256 ethToUse = (targetRTR * treasuryBalance - reserveBalance * 100) / targetRTR;
            require(ethToUse <= treasuryBalance, "Not enough ETH in Treasury");

            // Call Exchange to buy GAST
            uint256 gastPurchased = exchange.buy{value: ethToUse}();

            // Update Treasury's ETH balance
            treasury.rebalance();

            emit RebalancePerformed(ethToUse, gastPurchased);
        } else {
            // RTR is too high; sell GAST to align ratio
            uint256 excessReserve = (reserveBalance * 100 - targetRTR * treasuryBalance) / targetRTR;

            // Sell GAST for ETH
            uint256 gastToSell = excessReserve / curve.getSellPrice(1 ether); // Convert excessReserve to GAST amount
            uint256 ethReceived = exchange.sell(gastToSell);

            // Update Reserve's ETH balance
            reserve.withdraw(address(treasury), ethReceived);

            emit RebalancePerformed(ethReceived, gastToSell);
        }
    }

    /**
     * @notice Update the target RTR
     * @param _targetRTR The new target Reserve-Treasury Ratio
     */
    function updateTargetRTR(uint256 _targetRTR) external onlyOwner {
        targetRTR = _targetRTR;
    }

    /**
     * @notice Update the tolerance range for RTR
     * @param _tolerance The new tolerance range (percentage)
     */
    function updateTolerance(uint256 _tolerance) external onlyOwner {
        tolerance = _tolerance;
    }
}