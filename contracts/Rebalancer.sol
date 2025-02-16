// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Treasury.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract Rebalancer is Ownable {
    Treasury public treasury;
    uint256 public targetRTR = 50; // 기본값: 50% RTR
    uint256 public maxIterations = 50; // 최대 반복 횟수 (안전장치)
    uint256 public rebalance_range = 5; 
    uint256 public maxSpendRatio= 20; 

    bool public debugMode = false;

    event RebalanceTriggered(uint256 currentRTR, uint256 ethSpent, uint256 gastReceived);

    constructor(address _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid Treasury address");
        treasury = Treasury(_treasury);
    }

    function setTargetRTR(uint256 _targetRTR) external onlyOwner {
        require(_targetRTR > 0 && _targetRTR <= 100, "RTR must be between 1-100");
        targetRTR = _targetRTR;
    }

    function setMaxIterations(uint256 _maxIterations) external onlyOwner {
        require(_maxIterations > 0 && _maxIterations <= 10, "Max iterations must be 1-10");
        maxIterations = _maxIterations;
    }

    function triggerRebalance() external {
        if (debugMode) { 
            console.log("Contract: Rebalancer | Function: triggerRebalance()");
        }  
        uint256 reserveETH = address(treasury.reserve()).balance;
        uint256 treasuryETH = treasury.getBalance();
        uint256 currentRTR = (treasuryETH * 100) / reserveETH; 

        console.log("Checking RTR:", currentRTR, "%");

        if (currentRTR >= targetRTR - rebalance_range && currentRTR <= targetRTR + rebalance_range) {
            console.log("No rebalance needed. Current RTR is within range.");
            return;
        }

        console.log("Triggering rebalance...");
        uint256 ethBefore = treasury.getBalance();

        // 트레저리 리밸런스 호출
        treasury.rebalance(targetRTR, maxIterations);

        uint256 ethAfter = treasury.getBalance();
        uint256 ethSpent = ethBefore - ethAfter;
        uint256 gastReceived = treasury.gasToken().balanceOf(address(treasury));

        emit RebalanceTriggered(currentRTR, ethSpent, gastReceived);
    }
}