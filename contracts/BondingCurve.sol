// BondingCurve.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BondingCurveTable.sol";

contract BondingCurve {
    BondingCurveTable public priceTableContract;
    mapping(address => uint256) public balances;
    uint256 public totalSupply;

    event TokenPurchased(address indexed buyer, uint256 amount, uint256 price);
    event TokenSold(address indexed seller, uint256 amount, uint256 price);

    constructor(address _priceTableAddress) {
        priceTableContract = BondingCurveTable(_priceTableAddress);
    }

    function buyToken(uint256 amount) external payable {
        uint256 totalCost = 0;

        for (uint256 i = 0; i < amount; i++) {
            totalCost += priceTableContract.getPrice(totalSupply + i + 1);
        }

        require(msg.value >= totalCost, "Insufficient ETH sent");

        balances[msg.sender] += amount;
        totalSupply += amount;

        emit TokenPurchased(msg.sender, amount, totalCost);
    }

    function sellToken(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Not enough tokens");

        uint256 refundAmount = 0;

        for (uint256 i = 0; i < amount; i++) {
            refundAmount += priceTableContract.getPrice(totalSupply - i);
        }

        balances[msg.sender] -= amount;
        totalSupply -= amount;

        payable(msg.sender).transfer(refundAmount);

        emit TokenSold(msg.sender, amount, refundAmount);
    }
}