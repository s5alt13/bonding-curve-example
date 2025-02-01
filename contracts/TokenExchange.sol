// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./BondingCurve.sol";
import "./GASToken.sol";
import "./Reserve.sol";
import "./Treasury.sol";

contract TokenExchange {
    // Contract references
    BondingCurve public bondingCurve;
    GASToken public gasToken;
    Reserve public reserve;
    Treasury public treasury;

    // Events
    event Buy(address indexed buyer, uint256 ethAmount, uint256 gastAmount);
    event Sell(address indexed seller, uint256 gastAmount, uint256 ethAmount);

    constructor(
        address _bondingCurve, // 본딩 커브에서 price와 spraed를 조회 
        address _gasToken, // 토큰 발행 및 소각을 요청 
        address payable _reserve, // 리저브에 ETH 분배 TODO: 테스트용으로 추후 payable 삭제
        address _treasury // 트레저리에 ETH 분배
    ) {
        bondingCurve = BondingCurve(_bondingCurve);
        gasToken = GASToken(_gasToken);
        reserve = Reserve(_reserve);
        treasury = Treasury(_treasury);
    }

    /**
     * @notice Buy GAST with ETH
     * @dev Large transactions are split into smaller chunks for processing.
     * @dev ETH is split between Reserve and Treasury based on the spread.
     */
    function buy() external payable returns (uint256 gastAmount) {
        require(msg.value > 0, "TokenExchange: ETH amount must be greater than 0");

        // Calculate the amount of GAST tokens to mint based on the ETH sent
        gastAmount = bondingCurve.getBuyPrice(msg.value);
        
        // Mint GAST tokens for the buyer
        gasToken.mint(msg.sender, gastAmount);

        // TODO: spread가 1e18 단위로 되는지 확인 필요
        uint256 spread = bondingCurve.getSpread(); // 가정: getSpread()에서 reserveRatio를 반환 
        
        // Split ETH between Reserve and Treasury
        uint256 reserveShare = (msg.value * spread) / 1e18;
        uint256 treasuryShare = msg.value - reserveShare;

        reserve.deposit{value: reserveShare}();
        treasury.deposit{value: treasuryShare}();

        emit Buy(msg.sender, msg.value, gastAmount);

        return gastAmount; // Return the amount of GAST tokens minted
    }

    /**
     * @notice Sell GAST and receive ETH
     * @param gastAmount The amount of GAST tokens to sell
     */
    function sell(uint256 gastAmount) external returns (uint256 ethAmount) {
        require(gastAmount > 0, "BondingCurveExchange: GAST amount must be greater than 0");

        // Calculate the ETH amount to return based on the GAST amount
        ethAmount = bondingCurve.getSellPrice(gastAmount);

        // Burn GAST tokens from the seller
        gasToken.burnFrom(msg.sender, gastAmount);

        // Withdraw ETH from the Reserve
        reserve.withdraw(payable(msg.sender), ethAmount);

        emit Sell(msg.sender, gastAmount, ethAmount);

        return ethAmount; // Return the ETH amount sent to the seller
    }

    /**
     * @notice Estimate the amount of GAST tokens for a given ETH amount
     * @param ethAmount The amount of ETH to use for the estimate
     * @return gastAmount The estimated amount of GAST tokens
     */
    function estimateBuy(uint256 ethAmount) external view returns (uint256 gastAmount) {
        gastAmount = bondingCurve.getBuyPrice(ethAmount);
    }

    /**
     * @notice Estimate the amount of ETH for a given GAST amount
     * @param gastAmount The amount of GAST tokens to sell
     * @return ethAmount The estimated amount of ETH
     */
    function estimateSell(uint256 gastAmount) external view returns (uint256 ethAmount) {
        ethAmount = bondingCurve.getSellPrice(gastAmount);
    }

    /**
     * @notice Receive function to accept ETH transfers directly to the contract
     */
    receive() external payable {
        revert("BondingCurveExchange: Direct ETH transfers not allowed. Use buy() instead.");
    }
}