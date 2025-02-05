// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28; 

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GASToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** 18; // 100 million tokens

    constructor() ERC20("GASToken", "GAST") Ownable(msg.sender) {
        // Explicitly pass `msg.sender` to Ownable
    }    

    address public exchange; // BondingCurveExchange 컨트랙트 주소

    modifier onlyExchange() {
        require(msg.sender == exchange, "Reserve: caller is not the exchange");
        _;
    }

    function setExchange(address _exchange) external onlyOwner {
        require(_exchange != address(0), "Reserve: invalid exchange address");
        exchange = _exchange;
    }

    function mint(address account, uint256 amount) external onlyExchange {
        require(totalSupply() + amount <= MAX_SUPPLY, "GASToken: Exceeds maximum supply");
        _mint(account, amount); // Use ERC20's internal _mint function
    }

    function burn(uint256 amount) external onlyExchange {
        _burn(msg.sender, amount); // Use ERC20's internal _burn function
    }

    function burnFrom(address account, uint256 amount) external {
        uint256 currentAllowance = allowance(account, msg.sender);
        require(currentAllowance >= amount, "GASToken: burn amount exceeds allowance");
        _approve(account, msg.sender, currentAllowance - amount); // Reduce allowance
        _burn(account, amount); // Use ERC20's internal _burn function
    }
}