// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Reserve.sol";
import "./GASToken.sol";
import "./TokenExchange.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract Treasury is Ownable {
    Reserve public reserve;
    GASToken public gasToken;
    TokenExchange public exchange;

    uint256 public reserveRatio;
    uint256 public treasuryETHBalance;
    uint256 public reserveETHBalance;

    address public rebalancer;

    // modifier onlyRebalancer() {
    //     require(msg.sender == rebalancer, "Caller is not the Rebalancer");
    //     _;
    // }

    function setRebalancer(address _rebalancer) external {
        require(_rebalancer != address(0), "Invalid rebalancer address");
        rebalancer = _rebalancer;
    }

    event Deposit(address indexed depositor, uint256 ethAmount, uint256 newTreasuryBalance);
    event Withdraw(address indexed recipient, uint256 ethAmount);
    event Rebalance(uint256 remainingETH);

    constructor(address _reserve, address _gasToken, address _exchange) Ownable(msg.sender) {
        require(_reserve != address(0), "Invalid Reserve address");
        require(_gasToken != address(0), "Invalid GASToken address");
        // require(_exchange != address(0), "Invalid Exchange address");
        // require(_reserveRatio <= 100, "Reserve ratio must be <= 100");

        reserve = Reserve(payable(_reserve));
        gasToken = GASToken(_gasToken);
        exchange = TokenExchange(payable(_exchange));
        // reserveRatio = _reserveRatio;   
    }
    
    function deposit() external payable {
        console.log("Contract: Treasury | Function: deposit() | Sender:", msg.sender, "| Value:", msg.value);
        require(msg.value > 0, "Treasury: ETH amount must be greater than zero");
        treasuryETHBalance += msg.value; // Update Treasury ETH balance

        emit Deposit(msg.sender, msg.value, treasuryETHBalance); // Emit deposit event
    }  

    // NOTE: 
    function withdraw(address to, uint256 amount) external {
        console.log("Contract: Treasury | Function: withdraw() | Sender:", msg.sender);

        require(to != address(0), "Invalid recipient address");
        require(amount <= treasuryETHBalance, "Insufficient Treasury balance");

        treasuryETHBalance -= amount;
        (bool sent, ) = to.call{value: amount}("");
        require(sent, "ETH transfer failed");

        emit Withdraw(to, amount);
    }
    // NOTE: onlyRebalancer
    function rebalance() external {
        console.log("Contract: Treasury | Function: rebalance() | Sender:", msg.sender);

        require(address(exchange) != address(0), "Exchange not set");

        uint256 excessETH = treasuryETHBalance;
        require(excessETH > 0, "No excess ETH to rebalance");

        // Call Exchange to buy GAST
        exchange.buy{value: excessETH}();

        // Update balances
        treasuryETHBalance -= excessETH;

        emit Rebalance(treasuryETHBalance);
    }

    // function rebalance() external onlyRebalancer {}

    function getBalance() external view returns (uint256 balance) {
        console.log("Contract: Treasury | Function: getBalance() | Sender:", msg.sender);

        return treasuryETHBalance; // Return balance
    }

    // function updateReserveRatio(uint256 newRatio) external onlyOwner {
    //     require(newRatio <= 100, "Reserve ratio must be <= 100");
    //     reserveRatio = newRatio;
    // }

    // NOTE: 테스트용
    function updateExchange(address _exchange) external {
        console.log("Contract: Treasury | Function: updateExchange() | Sender:", msg.sender);

        require(_exchange != address(0), "Invalid Exchange address");
        exchange = TokenExchange(payable(_exchange));
    }

    // function receive() {}
}