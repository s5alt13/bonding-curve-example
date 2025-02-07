// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract Reserve is Ownable {
    event Deposit(address indexed depositor, uint256 ethAmount);
    event Withdraw(address indexed recipient, uint256 ethAmount);
    event BalanceChecked(address indexed caller, uint256 balance);
    
    address public exchange;

    constructor() Ownable(msg.sender) {}

    // modifier onlyExchange() {
    //     require(msg.sender == exchange, "Reserve: caller is not the exchange" );
    //     _;
    // }

    // NOTE: 테스트용, 추후 삭제
    function setExchange(address _exchange) external onlyOwner {
        console.log("Contract: Reserve | Function: setExchange() | Sender:", msg.sender);
        require(_exchange != address(0), "Reserve: invalid exchange address");
        exchange = _exchange;
    }

    // NOTE: 추후 수정자 적용, onlyExchange
    function deposit() external payable {
        console.log("Contract: Reserve | Function: deposit() | Sender:", msg.sender, "| Value:", msg.value);
        require(msg.value > 0, "Reserve: ETH amount must be greater than zero");
        emit Deposit(msg.sender, msg.value);
    }

    // NOTE: 추후 수정자 적용, onlyExchange
    function withdraw(address to, uint256 ethAmount) external {
        console.log("Contract: Reserve | Function: withdraw() | Sender:", msg.sender);
        require(to != address(0), "Reserve: invalid recipient address");
        require(address(this).balance >= ethAmount, "Reserve: insufficient ETH balance");

        payable(to).transfer(ethAmount);

        emit Withdraw(to, ethAmount);
    }

    function getBalance() external view returns (uint256 balance) {
        console.log("Contract: Reserve | Function: getBalance() | Sender:", msg.sender);
        balance = address(this).balance;
        return balance;
    }

    receive() external payable {
        console.log("Contract: Reserve | Function: receive() | Sender:", msg.sender);
        emit Deposit(msg.sender, msg.value);
    }
}