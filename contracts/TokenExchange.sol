// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./BondingCurve.sol";
import "./GASToken.sol";
import "./Reserve.sol";
import "./Treasury.sol";
import "hardhat/console.sol";

contract TokenExchange {

    BondingCurve public bondingCurve;
    GASToken public gasToken;
    Reserve public reserve;
    Treasury public treasury;

    event Buy(address indexed buyer,uint256 ethAmount, uint256 gastAmount );
    event Sell(address indexed seller, uint256 gastAmount, uint256 ethAmount);

    constructor(
        address _bondingCurve,
        address _gasToken,
        address payable _reserve, // NOTE: 테스트용, 추후 삭제
        address _treasury
    ) {
        bondingCurve = BondingCurve(_bondingCurve);
        gasToken = GASToken(_gasToken);
        reserve = Reserve(_reserve);
        treasury = Treasury(_treasury);
    }

    function buy() external payable returns (uint256 gastAmount) {
        // console.log("Contract: TokenExchange | Function: buy() | Sender:", msg.sender, "| Value:", msg.value);
        require(msg.value > 0, "TokenExchange: ETH amount must be greater than 0");

        // uint256 buyPrice = bondingCurve.getBuyPrice(); 
        // gastAmount = msg.value / buyPrice;
        // uint256 spread = bondingCurve.getSpread();

        (uint256 buyPrice, uint256 spread) = bondingCurve.getBuyPrice();
        gastAmount = msg.value / buyPrice;

        gasToken.mint(msg.sender, gastAmount); 
        console.log("Minted GASToken Amount:", gastAmount);

        // 단위 확인
        uint256 reserveShare = (msg.value * spread) / 1e18;
        uint256 treasuryShare = msg.value - reserveShare;

        reserve.deposit{value: reserveShare}();
        treasury.deposit{value: treasuryShare}();

        emit Buy(msg.sender, msg.value, gastAmount);

        return gastAmount;
    }
    
    function sell(uint256 gastAmount) external returns(uint256 ethAmount) {
        console.log("Contract: TokenExchange | Function: sell() | Sender:", msg.sender);
        require(gastAmount > 0, "BondingCurveExchange: GAST amount must be greater than 0");

        uint256 sellPrice = bondingCurve.getSellPrice();
        ethAmount = gastAmount * sellPrice;

        gasToken.burnFrom(msg.sender, gastAmount);
        console.log("Burn GASToken Amount:", gastAmount);

        reserve.withdraw(payable(msg.sender), ethAmount);

        emit Sell(msg.sender, gastAmount, ethAmount);

        return ethAmount;
    }

    // function estimateBuy(uint256 ethAmount) external view returns (uint256 gastAmount) {
    //     uint256 buyPrice = bondingCurve.getBuyPrice();
    //     gastAmount = ethAmount * buyPrice;
    //     return gastAmount;
    // }

    // function estimateSell(uint256 gastAmount) external view returns (uint256 ethAmount) {
    //     uint256 sellPrice = bondingCurve.getSellPrice();
    //     ethAmount = gastAmount * sellPrice;
    //     return ethAmount;
    // }
    receive() external payable {
        // console.log("Contract: TokenExchange | Function: receive() | Sender:", msg.sender);
        revert("BondingCurveExchange: Direct ETH transfers not allowed. Use buy() instead.");
    }

    // NOTE: 테스트용, 추후 삭제
    function updateTreasury(address _treasury) public {
        // console.log("Contract: TokenExchange | Function: updateTreasury() | Sender:", msg.sender);
        require(_treasury != address(0), "TokenExchange: invalid treasury address");
        treasury = Treasury(_treasury);
    }




}

