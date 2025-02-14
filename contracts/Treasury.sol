// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Reserve.sol";
import "./GASToken.sol";
import "./TokenExchange.sol";
import "./Rebalancer.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";


contract Treasury is Ownable {
    Reserve public reserve;
    GASToken public gasToken;
    TokenExchange public exchange;
    Rebalancer public rebalancer;

    uint256 public reserveRatio;
    uint256 public treasuryETHBalance;
    uint256 public reserveETHBalance;

    bool public debugMode = true;

    // modifier onlyRebalancer() {
    //     require(msg.sender == rebalancer, "Caller is not the Rebalancer");
    //     _;
    // }

    function setRebalancer(address _rebalancer) external {
        require(_rebalancer != address(0), "Invalid rebalancer address");
        rebalancer = Rebalancer(_rebalancer); // ✅ 형 변환 추가
    }

    event Deposit(address indexed depositor, uint256 ethAmount, uint256 newTreasuryBalance);
    event Withdraw(address indexed recipient, uint256 ethAmount);
    event Rebalanced(uint256 ethSpent, uint256 gastReceived, uint256 finalTreasuryETH);

    constructor(address _reserve, address _gasToken, address _exchange, address _rebalancer) Ownable(msg.sender) {
        require(_reserve != address(0), "Invalid Reserve address");
        require(_gasToken != address(0), "Invalid GASToken address");
        // require(_exchange != address(0), "Invalid Exchange address");
        // require(_reserveRatio <= 100, "Reserve ratio must be <= 100");

        reserve = Reserve(payable(_reserve));
        gasToken = GASToken(_gasToken);
        exchange = TokenExchange(payable(_exchange));
        rebalancer = Rebalancer(_rebalancer);
        // reserveRatio = _reserveRatio;   
    }
    
    function deposit() external payable {
        if (debugMode) { 
            console.log("Contract: Treasury | Function: deposit() | Sender:", msg.sender, "| Value:", msg.value);
        }   
        
        require(msg.value > 0, "Treasury: ETH amount must be greater than zero");
        treasuryETHBalance += msg.value; // Update Treasury ETH balance

        emit Deposit(msg.sender, msg.value, treasuryETHBalance); // Emit deposit event
    }  

    // NOTE: 
    function withdraw(address to, uint256 amount) external {
        if (debugMode) { 
            console.log("Contract: Treasury | Function: withdraw() | Sender:", msg.sender);
        }   

        require(to != address(0), "Invalid recipient address");
        require(amount <= address(this).balance, "Insufficient Treasury balance");

        // treasuryETHBalance -= amount;
        (bool sent, ) = to.call{value: amount}("");
        require(sent, "ETH transfer failed");

        emit Withdraw(to, amount);
    }
    
    // NOTE: onlyRebalancer
    // function rebalance() external {
    //     if (debugMode) { 
    //         console.log("Contract: Treasury | Function: rebalance() | Sender:", msg.sender);
    //     }   

    //     require(address(exchange) != address(0), "Exchange not set");

    //     uint256 excessETH = treasuryETHBalance;
    //     require(excessETH > 0, "No excess ETH to rebalance");

    //     // Call Exchange to buy GAST
    //     exchange.buy{value: excessETH}();

    //     // Update balances
    //     treasuryETHBalance -= excessETH;

    //     emit Rebalance(treasuryETHBalance);
    // }

    function getBalance() external view returns (uint256 balance) {
        if (debugMode) { 
            console.log("Contract: Treasury | Function: getBalance() | Sender:", msg.sender);
        } 

        return address(this).balance; // Return balance
    }

    // NOTE: 테스트용
    function updateExchange(address _exchange) external {
        if (debugMode) { 
            console.log("Contract: Treasury | Function: updateExchange() | Sender:", msg.sender);
        }    

        require(_exchange != address(0), "Invalid Exchange address");
        exchange = TokenExchange(payable(_exchange));
    }

    // function receive() {}

    // function rebalance() external onlyRebalancer {}

    // function updateReserveRatio(uint256 newRatio) external onlyOwner {
    //     require(newRatio <= 100, "Reserve ratio must be <= 100");
    //     reserveRatio = newRatio;
    // }
    
    // TODO: 파라미터 수정
    function rebalance(uint256 targetRTR, uint256 maxIterations) external {
        console.log("Contract: Treasury | Function: rebalance() ");
        
        require(address(exchange) != address(0), "Exchange not set");
        require(targetRTR > 0 && targetRTR <= 100, "Invalid target RTR");
        require(maxIterations > 0 , "Invalid iteration limit");

        uint256 reserveETH = address(reserve).balance; // 리저브 현재 잔액
        uint256 treasuryETH = address(this).balance;  // 트레저리 현재 잔액
        uint256 currentRTR = (treasuryETH * 100) / reserveETH; // 현재 RTR 계산
        uint256 range = rebalancer.rebalance_range();

        if (currentRTR >= targetRTR - range && currentRTR <= targetRTR + range) {
                console.log("No rebalance needed. Current RTR:", currentRTR);
            return; // RTR이 목표 범위 내에 있으면 실행 안 함
        }

        uint256 totalEthSpent = 0;
        uint256 totalGastReceived = 0;
        uint256 iterations = 0;

        while (iterations < maxIterations) {
            // 비율만큼 판매
            console.log("Rebalance Iteration:", iterations + 1);

            reserveETH = address(reserve).balance; // 리저브의 ETH 잔액 업데이트
            treasuryETH = address(this).balance; // 트레저리의 ETH 잔액 업데이트
            currentRTR = (treasuryETH * 100) / reserveETH; // RTR 업데이트
            console.log("Checking RTR:", currentRTR, "%");

            if (currentRTR >= targetRTR - range && currentRTR <= targetRTR + range) {
                break; // 목표 RTR 범위 내에 들어오면 반복 종료
            }

            // 트레저리 ETH의 20%까지만 사용
            uint256 maxSpend = treasuryETH * rebalancer.maxSpendRatio() / 100;
            uint256 ethToUse = maxSpend < treasuryETH ? maxSpend : treasuryETH;

            uint256 gastReceived = exchange.buy{value: ethToUse}(); // GAST 매수 실행
            
            totalEthSpent += ethToUse; // 이번 리밸런싱을 통해 소비한 ETH
            totalGastReceived += gastReceived; // 이번 리밸런싱을 통해 구매한 GAST

            iterations++;
        }

        emit Rebalanced(totalEthSpent, totalGastReceived, treasuryETHBalance); // 리밸런싱 완료 이벤트
    }

    // function updateRebalancer(address _rebalancer) external {
    //     if (debugMode) { 
    //         console.log("Contract: Treasury | Function: updateRebalancer() | Sender:", msg.sender);
    //     }    

    //     require(_rebalancer != address(0), "Invalid Exchange address");
    //     rebalancer = Rebalancer(_rebalancer);
    // }
}

