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

    bool public debugMode = false;

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
        if (debugMode) { 
            console.log("Contract: TokenExchange | Function: buy() | Sender:", msg.sender, "| Value:", msg.value);
        }   
        
        require(msg.value > 0, "TokenExchange: ETH amount must be greater than 0");
        
        (uint256 buyPrice, uint256 spread) = bondingCurve.getBuyPrice();
        gastAmount = msg.value / buyPrice;

        // TODO: Decimals 조정
        uint256 currentSupply = gasToken.totalSupply(); // 현재 총 공급량
        uint256 maxSupply = gasToken.MAX_SUPPLY() / 10 ** 18; // 18 decimals 제거

        uint256 allowedGastAmount = gastAmount;
        uint256 refundETH = 0;

        // 🔍 최대 공급량을 초과하는 경우, 조정
        if (currentSupply + gastAmount > maxSupply) {
            allowedGastAmount = maxSupply - currentSupply; // 최대 발행 가능한 GAST 수량
            refundETH = (gastAmount - allowedGastAmount) * buyPrice; // 초과분에 해당하는 ETH 반환
            gastAmount = allowedGastAmount; // 발행량 업데이트
        }

        gasToken.mint(msg.sender, gastAmount); 
        console.log("Minted GASToken Amount:", gastAmount);

        uint256 netEth = msg.value - refundETH;
    
        // uint256 reserveShare = (netEth * spread) / 1e18;
        // uint256 treasuryShare = netEth - reserveShare;

        uint256 treasuryShare = (netEth * spread) / 1e18;
        uint256 reserveShare = netEth - treasuryShare; 

        reserve.deposit{value: reserveShare}();
        treasury.deposit{value: treasuryShare}();

        // 초과 ETH 반환
        if (refundETH > 0) {
            payable(msg.sender).transfer(refundETH);
            console.log("Refunded Excess ETH:", refundETH);
        }

        emit Buy(msg.sender, msg.value, gastAmount);

        return gastAmount;
    }
    
    function sell(uint256 gastAmount) external returns(uint256 ethAmount) {
        if (debugMode) { 
            console.log("Contract: TokenExchange | Function: sell() | Sender:", msg.sender);
        }   

        require(gastAmount > 0, "BondingCurveExchange: GAST amount must be greater than 0");

        uint256 sellPrice = bondingCurve.getSellPrice();
        ethAmount = gastAmount * sellPrice;

        // 현재 리저브 잔액 확인
        uint256 reserveBalance = address(reserve).balance;

        // ethAmount가 리저브에 있는 ETH보다 크면 남은 ETH만 지급
        if (ethAmount > reserveBalance) {
            ethAmount = reserveBalance; // 리저브에 있는 만큼만 지급
            console.log("Reserve ETH exceeded, adjusting withdrawal amount.");
        }

        gasToken.burnFrom(msg.sender, gastAmount);
        console.log("Burn GASToken Amount:", gastAmount);

        reserve.withdraw(payable(msg.sender), ethAmount);

        emit Sell(msg.sender, gastAmount, ethAmount);

        return ethAmount;
    }

    receive() external payable {
        if (debugMode) { 
            console.log("Contract: TokenExchange | Function: receive() | Sender:", msg.sender);
        }   

        revert("BondingCurveExchange: Direct ETH transfers not allowed. Use buy() instead.");
    }

    // NOTE: 테스트용, 추후 삭제
    function updateTreasury(address _treasury) public {
        if (debugMode) { 
            console.log("Contract: TokenExchange | Function: updateTreasury() | Sender:", msg.sender);
        }  
        
        require(_treasury != address(0), "TokenExchange: invalid treasury address");
        treasury = Treasury(_treasury);
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

}

