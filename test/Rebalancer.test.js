const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Rebalancer Contract", function () {
    let Rebalancer, Treasury, Reserve, TokenExchange, BondingCurve;
    let rebalancer, treasury, reserve, exchange, bondingCurve;
    let owner, addr1, addr2;
    const targetRTR = 10; // 목표 RTR: 10%
    const tolerance = 2; // 허용 오차: ±2%

    beforeEach(async function () {
        [owner, addr1, addr2, rebalancer] = await ethers.getSigners();

        console.log("🚀 Deploying Mock Reserve contract...");
        const ReserveMock = await ethers.getContractFactory("Reserve");
        reserve = await ReserveMock.deploy();
        await reserve.waitForDeployment();
        const reserveAddress = await reserve.getAddress();
        console.log("✅ Reserve deployed at:", reserveAddress);
    
        console.log("🚀 Deploying Mock GASToken contract...");
        const GASTokenMock = await ethers.getContractFactory("GASToken");
        gasToken = await GASTokenMock.deploy();
        await gasToken.waitForDeployment();
        const gasTokenAddress = await gasToken.getAddress();
        console.log("✅ GASToken deployed at:", gasTokenAddress);
    
        console.log("🚀 Deploying Mock TokenExchange contract...");
        const TokenExchangeMock = await ethers.getContractFactory("TokenExchange");
        exchange = await TokenExchangeMock.deploy(reserveAddress, gasTokenAddress, "0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000"); // BondingCurve 주소 임시값
        await exchange.waitForDeployment();
        const exchangeAddress = await exchange.getAddress();
        console.log("✅ TokenExchange deployed at:", exchangeAddress);
    
        console.log("🚀 Deploying Treasury contract...");
        const TreasuryContract = await ethers.getContractFactory("Treasury");
        treasury = await TreasuryContract.deploy(reserveAddress, gasTokenAddress, exchangeAddress, 10); // Exchange 주소 전달
        await treasury.waitForDeployment();
        const treasuryAddress = await treasury.getAddress();
        console.log("✅ Treasury deployed at:", treasuryAddress);
    
        console.log("🚀 Deploying Rebalancer contract...");
        const RebalancerContract = await ethers.getContractFactory("Rebalancer");
        rebalancer = await RebalancerContract.deploy(treasuryAddress, reserveAddress, exchangeAddress, 10, 2); // targetRTR = 10, tolerance = 2
        await rebalancer.waitForDeployment();
        console.log("✅ Rebalancer deployed at:", await rebalancer.getAddress());
    });

    /** ✅ 테스트를 위한 초기 셋팅 배포가 잘 되었는지 확인 */
    it("should deploy with correct initial settings", async function () {
        expect(await rebalancer.treasury()).to.equal(await treasury.getAddress());
        expect(await rebalancer.reserve()).to.equal(await reserve.getAddress());
        expect(await rebalancer.exchange()).to.equal(await exchange.getAddress());
        expect(await rebalancer.targetRTR()).to.equal(targetRTR);
        expect(await rebalancer.tolerance()).to.equal(tolerance);
    });

    // /** ✅ RTR 계산이 정상적으로 수행되는지 확인 */
    // TODO: Reserve에 ETH를 증가시켜야 해서 조금 애매한 감이 있음. 
    // 일단 테스트 상에서는 그냥 ETH를 받을 수 있는 것으로 구현하여 진행 
    it("should correctly check if RTR is within bounds", async function () {
        console.log("🔍 Depositing ETH to Treasury...");
        await treasury.deposit({ value: ethers.parseEther("10") });
    
        console.log("🔍 Sending ETH directly to Reserve...");
        await owner.sendTransaction({
            to: await reserve.getAddress(),
            value: ethers.parseEther("1")
        });
    
        const withinBounds = await rebalancer.checkRTR();
        console.log("🔍 RTR within bounds:", withinBounds);
        expect(withinBounds).to.be.true;
    });

    /** ✅ OnlyOwner 제한 테스트 */
    // NOTE: revertedWith()는 OpenZepplin의 구버전에서 사용하므로 최신 버전에서는 revertedWithCustomError()를 사용해야 함
    it("should allow only owner to trigger rebalance", async function () {
        console.log("🔍 Owner Address:", owner.address);
        console.log("🔍 Unauthorized Address:", addr1.address);
    
        await expect(rebalancer.connect(addr1).triggerRebalance())
            .to.be.revertedWithCustomError(rebalancer, "OwnableUnauthorizedAccount")
            .withArgs(addr1.address);
    });
    
    // TODO: 추후 테스트
    /** ✅ RTR이 정상 범위에 있을 때 triggerRebalance가 실행되지 않는지 확인 */
    // it("should not trigger rebalance when RTR is within tolerance", async function () {
    //     // Treasury에 10 ETH 입금
    //     await treasury.deposit({ value: ethers.parseEther("10") });

    //     // Reserve에 1 ETH 입금 (deposit 대신 sendTransaction 사용)
    //     await owner.sendTransaction({
    //         to: await reserve.getAddress(),
    //         value: ethers.parseEther("1")
    //     });

    //     console.log("🔍 Checking RTR before rebalancing...");
        
    //     await expect(rebalancer.connect(owner).triggerRebalance())
    //         .to.emit(rebalancer, "RebalanceTriggered")
    //         .withArgs(
    //             await ethers.provider.getBalance(await reserve.getAddress()),
    //             await ethers.provider.getBalance(await treasury.getAddress()),
    //             targetRTR,
    //             true
    //         );
    // });

    // TODO: 추후 테스트
    /** ✅ RTR이 벗어나면 triggerRebalance가 실행되는지 확인 */
    // it("should trigger rebalance when RTR is out of tolerance", async function () {
    //     // Treasury에 10 ETH 입금
    //     await treasury.deposit({ value: ethers.parseEther("10") });

    //     // Reserve에 0.1 ETH 입금 (payable을 사용하여 직접 전송)
    //     await owner.sendTransaction({
    //         to: await reserve.getAddress(),
    //         value: ethers.parseEther("0.1")
    //     });

    //     console.log("🔍 Checking RTR before rebalancing...");
        
    //     // 현재 Reserve 및 Treasury 잔액 가져오기 (BigInt 타입)
    //     const reserveBalance = await ethers.provider.getBalance(await reserve.getAddress());
    //     const treasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());

    //     // 잔액을 ETH 단위로 변환 후 출력
    //     console.log(`🔍 Reserve Balance: ${ethers.formatEther(reserveBalance)} ETH`);
    //     console.log(`🔍 Treasury Balance: ${ethers.formatEther(treasuryBalance)} ETH`);

    //     // BigInt를 String으로 변환 후 계산
    //     const reserveBalanceNum = parseFloat(ethers.formatEther(reserveBalance));
    //     const treasuryBalanceNum = parseFloat(ethers.formatEther(treasuryBalance));

    //     // 현재 RTR 값 계산
    //     const currentRTR = (reserveBalanceNum * 100) / treasuryBalanceNum;
    //     console.log(`🔍 Current RTR: ${currentRTR}, Target RTR: ${targetRTR}`);

    //     // Rebalance 실행 로그 추가
    //     console.log("🔍 Attempting to trigger rebalance...");
        
    //     try {
    //         await expect(rebalancer.connect(owner).triggerRebalance())
    //             .to.emit(rebalancer, "RebalanceTriggered")
    //             .withArgs(
    //                 reserveBalance,
    //                 treasuryBalance,
    //                 targetRTR,
    //                 false
    //             );
    //     } catch (error) {
    //         console.error("🚨 Rebalance failed with error:", error);
    //     }
    // });

    /** ✅ Owner가 RTR 목표 값을 변경할 수 있는지 확인 */
    it("should allow owner to update target RTR", async function () {
        console.log("🔍 Updating target RTR...");
        await rebalancer.connect(owner).updateTargetRTR(15);
        const newRTR = await rebalancer.targetRTR();
        console.log("🔍 Updated target RTR:", newRTR);
        expect(newRTR).to.equal(15);
    });

    /** ✅ Owner가 RTR 허용 오차 값을 변경할 수 있는지 확인 */
    it("should allow owner to update tolerance", async function () {
        console.log("🔍 Updating tolerance value...");
        await rebalancer.connect(owner).updateTolerance(5);
        const newTolerance = await rebalancer.tolerance();
        console.log("🔍 Updated tolerance value:", newTolerance);
        expect(newTolerance).to.equal(5);
    });
});