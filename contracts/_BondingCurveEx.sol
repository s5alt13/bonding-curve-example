// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28; 

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol"; // Hardhat의 내장 `console` 사용

contract BondingCurveEX is ERC20, Ownable {
    uint256 public reserve; // 컨트랙트에 저장된 ETH의 총량
    uint256 public tokenPrice = 0.01 ether; // 초기 토큰 가격 (ETH 단위)

    // 생성자
    constructor() ERC20("BondingCurveToken", "BCT") Ownable(msg.sender) {}

    // 1. 토큰 구매 함수
    function buyTokens() external payable {
    require(msg.value > 0, "Must send ETH to buy tokens");

    uint256 tokensToMint = (msg.value * (10 ** decimals())) / tokenPrice; // 구매할 토큰 개수
    reserve += msg.value; // 리저브에 ETH 추가
    _mint(msg.sender, tokensToMint); // 사용자에게 토큰 발행

    // 가격 점진적 상승 (간단한 선형 증가)
    tokenPrice += 0.001 ether; // 구매 시마다 가격 상승
}

    // 2. 토큰 판매 함수
function sellTokens(uint256 amount) external {
    console.log("Caller:", msg.sender);
    console.log("Selling Amount:", amount);
    console.log("Balance Before:", balanceOf(msg.sender));
    console.log("Reserve Before:", reserve);

    require(balanceOf(msg.sender) >= amount, "Insufficient token balance");
    require(amount > 0, "Amount must be greater than zero");

    uint256 ethToReturn = (amount * tokenPrice) / (10 ** decimals());
    console.log("ETH to Return:", ethToReturn);
    require(reserve >= ethToReturn, "Not enough ETH in reserve");

    _burn(msg.sender, amount);
    reserve -= ethToReturn;

    console.log("Balance After:", balanceOf(msg.sender));
    console.log("Reserve After:", reserve);

    payable(msg.sender).transfer(ethToReturn);
    tokenPrice -= 0.001 ether;
    console.log("Updated Price:", tokenPrice);
}

    // 3. 리저브 확인 함수
    function getReserve() external view returns (uint256) {
        return reserve;
    }

    // 4. ETH 인출
    function withdrawETH(uint256 amount) external onlyOwner {
        require(reserve >= amount, "Not enough ETH in reserve");
        reserve -= amount;
        payable(msg.sender).transfer(amount);
}
}