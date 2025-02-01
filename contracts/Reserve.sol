// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Reserve
 * @dev Holds ETH for GAST operations and manages deposits and withdrawals securely.
 */
contract Reserve is Ownable {
    // Events
    event Deposit(address indexed depositor, uint256 ethAmount);
    event Withdraw(address indexed recipient, uint256 ethAmount);
    event BalanceChecked(address indexed caller, uint256 balance);

    address public exchange; // BondingCurveExchange 컨트랙트 주소

    constructor() Ownable(msg.sender) {}

    modifier onlyExchange() {
        require(msg.sender == exchange, "Reserve: caller is not the exchange");
        _;
    }

    function setExchange(address _exchange) external onlyOwner {
        require(_exchange != address(0), "Reserve: invalid exchange address");
        exchange = _exchange;
    }

    /**
     * @notice Fallback function to accept ETH directly.
     */
    // receive() external payable {} // 외부에서 받을 일 없음. 
    
    // TODO: 수정자 TIP
    // 권한이 Exchange 만 하는게 아니라 트레저리가 호출하거나 하는 경우도 고려해야 한다면? (물론 아님) 
    // 수정자를 아래와 같은 방식으로도 할 수 있음
    // alloweContracts 를 만들어서 이들만 부를 수 있도록 관리 

    // mapping(address => bool) public allowedContracts;

    // modifier onlyAllowedContracts() {
    //     require(allowedContracts[msg.sender], "Reserve: caller is not an allowed contract");
    //     _;
    // }

    // function setAllowedContract(address contractAddress, bool status) external onlyOwner {
    //     allowedContracts[contractAddress] = status;
    // }
    /**
     * @notice Allows the owner to deposit ETH into the Reserve contract.
     */
    function deposit() external payable onlyExchange {
        require(msg.value > 0, "Reserve: ETH amount must be greater than zero");

        emit Deposit(msg.sender, msg.value); // Emit deposit event
    }

    /**
     * @notice Allows the Exchange to withdraw a specified amount of ETH to a given address.
     * @param to The address to receive the withdrawn ETH.
     * @param amount The amount of ETH to withdraw.
     */

    //TODO: Reserver가 직접 transfer를 하는 것보다 exchange로 반환하여 exchange.transfer(user, amount) 방식으로 구현하는 것이 
    // 더 나은 방법. exchange가 모든 흐름을 통제할 수 있고, 역할적으로 분배. 보안성 강화 (reserve 자체의 ETH 전송 기능 없앰)
    // 추후 유연한 자금 관리 가능 (예. 수수료 공제, 추가 로직 적용)
    function withdraw(address to, uint256 amount) external onlyExchange {
        require(to != address(0), "Reserve: invalid recipient address");
        require(address(this).balance >= amount, "Reserve: insufficient ETH balance");

        payable(to).transfer(amount);

        emit Withdraw(to, amount);
    }

    /**
     * @notice Returns the current balance of the Reserve contract.
     * @return The ETH balance held by the contract.
     */
    function getBalance() external view returns (uint256) {
        uint256 balance = address(this).balance;
        return balance;
    }

    /**
     * NOTE: 새롭게 추가된 함수로 테스트를 위해 추가함. 배포 시 삭제해야함.
     * @notice Allows anyone to send ETH to the Reserve (for testing purposes).
     */
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }
}