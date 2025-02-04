// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Reserve.sol";
import "./GASToken.sol";
import "./TokenExchange.sol";

contract Treasury is Ownable {
    Reserve public reserve; // Reserve contract reference
    GASToken public gastToken; // GASToken contract reference
    TokenExchange public exchange; // Exchange contract reference

    uint256 public reserveRatio; // Percentage of ETH to Reserve (e.g., 10 means 10%)
    uint256 public treasuryETHBalance; // ETH balance managed by Treasury
    uint256 public reserveETHBalance; // ETH balance managed by Reserve

    address public rebalancer; // Address of the Rebalancing contract

    /**
     * @notice Sets the Rebalancing contract address
     * @param _rebalancer The address of the Rebalancing contract
     */
    function setRebalancer(address _rebalancer) external onlyOwner {
        require(_rebalancer != address(0), "Invalid rebalancer address");
        rebalancer = _rebalancer;
    }

    /**
     * @notice Modifier to restrict access to the rebalancer contract
     */
    modifier onlyRebalancer() {
        require(msg.sender == rebalancer, "Caller is not the Rebalancer");
        _;
    }

    /**
     * @notice Rebalances ETH by purchasing GAST until reserve ratio is satisfied
     */


    event Deposit(address indexed depositor, uint256 ethAmount, uint256 newTreasuryBalance);
    event Withdraw(address indexed recipient, uint256 ethAmount);
    event Rebalance(uint256 remainingETH);

    constructor(address _reserve, address _gastToken, address _exchange, uint256 _reserveRatio) Ownable(msg.sender) {
        require(_reserve != address(0), "Invalid Reserve address");
        require(_gastToken != address(0), "Invalid GASToken address");
        // require(_exchange != address(0), "Invalid Exchange address");
        require(_reserveRatio <= 100, "Reserve ratio must be <= 100");

        reserve = Reserve(payable(_reserve));
        gastToken = GASToken(_gastToken);
        exchange = TokenExchange(payable(_exchange));
        reserveRatio = _reserveRatio;   
    }


    function deposit() external payable {
        require(msg.value > 0, "Treasury: ETH amount must be greater than zero");

        treasuryETHBalance += msg.value; // Update Treasury ETH balance

        emit Deposit(msg.sender, msg.value, treasuryETHBalance); // Emit deposit event
    }   

    /**
     * @notice Withdraws ETH from the Treasury
     * @param to The address to send ETH to
     * @param amount The amount of ETH to withdraw
     */

    // TODO: 수정자 업데이트
    function withdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid recipient address");
        require(amount <= treasuryETHBalance, "Insufficient Treasury balance");

        treasuryETHBalance -= amount;
        (bool sent, ) = to.call{value: amount}("");
        require(sent, "ETH transfer failed");

        emit Withdraw(to, amount);
    }

    /**
     * @notice Rebalances ETH by purchasing GAST until reserve ratio is satisfied
     */
    
    function rebalance() external onlyRebalancer {
        require(address(exchange) != address(0), "Exchange not set");

        uint256 excessETH = treasuryETHBalance;
        require(excessETH > 0, "No excess ETH to rebalance");

        // Call Exchange to buy GAST
        exchange.buy{value: excessETH}();

        // Update balances
        treasuryETHBalance -= excessETH;

        emit Rebalance(treasuryETHBalance);
    }

    /**
     * @notice Get the current Treasury ETH balance
     * @return balance The current ETH balance in Treasury
     */
    function getBalance() external view returns (uint256 balance) {
        return treasuryETHBalance; // Return balance
    }

    /**
     * @notice Updates the reserve ratio
     * @param newRatio The new reserve ratio (percentage, e.g., 10 means 10%)
     */
    // TODO: 수정자 업데이트
    function updateReserveRatio(uint256 newRatio) external onlyOwner {
        require(newRatio <= 100, "Reserve ratio must be <= 100");
        reserveRatio = newRatio;
    }
    // NOTE: 배포 시 순서 때문에 추가함. 트레저리는 자금을 가지고 있어 변경하기 어렵지만, Exchange는 가능하기 때문에 업데이트 하는 것으로
    function updateExchange(address _exchange) external onlyOwner {
        require(_exchange != address(0), "Invalid Exchange address");
        exchange = TokenExchange(payable(_exchange));
    }

    // receive() 함수가 필요할까? 
}