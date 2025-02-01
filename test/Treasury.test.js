const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Treasury Contract", function () {
    let treasury, reserve, gasToken, exchange;
    let owner, addr1, addr2, rebalancer;
    const initialReserveRatio = 10; // 10%

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
        
        // TIP: try catch를 통해서 테스트를 통과시킨 후 에러 처리를 할 수 있음
        console.log("🚀 Deploying Mock TokenExchange contract...");
        try {
            const TokenExchangeMock = await ethers.getContractFactory("TokenExchange");
            exchange = await TokenExchangeMock.deploy(reserveAddress, gasTokenAddress, "0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000");
            await exchange.waitForDeployment();
            console.log("✅ TokenExchange deployed at:", await exchange.getAddress());
        } catch (error) {
            console.error("❌ TokenExchange 배포 실패! 에러:", error);
            throw error; // 테스트 실패하도록 강제 종료
        }

        console.log("🚀 Deploying Treasury contract...");
        const TreasuryContract = await ethers.getContractFactory("Treasury");
        treasury = await TreasuryContract.deploy(reserveAddress, gasTokenAddress, await exchange.getAddress(), initialReserveRatio);
        await treasury.waitForDeployment();
        console.log("✅ Treasury deployed at:", await treasury.getAddress());
    });

    /** ✅ 테스트를 위한 초기 셋팅 배포가 잘 되었는지 확인 */
    it("should deploy with correct initial settings", async function () {
        expect(await treasury.reserve()).to.equal(await reserve.getAddress());
        expect(await treasury.gastToken()).to.equal(await gasToken.getAddress());
        expect(await treasury.exchange()).to.equal(await exchange.getAddress());
        expect(await treasury.reserveRatio()).to.equal(initialReserveRatio);
        expect(await treasury.treasuryETHBalance()).to.equal(0);
    });
    
     /** ✅ 입금 (Deposit) 기능 테스트 */
     it("should allow deposits and update balances", async function () {
        const depositAmount = ethers.parseEther("1");

        await treasury.connect(addr1).deposit({ value: depositAmount });

        expect(await treasury.treasuryETHBalance()).to.equal(depositAmount);
    });

    it("should fail to deposit 0 ETH", async function () {
        await expect(treasury.connect(addr1).deposit({ value: 0 })).to.be.revertedWith("Treasury: ETH amount must be greater than zero");
    });

    
    /** ✅ 출금 (Withdraw) 기능 테스트 */
    it("should allow withdrawals by the owner", async function () {
        const depositAmount = ethers.parseEther("1");
        const withdrawAmount = ethers.parseEther("0.5");

        await treasury.connect(addr1).deposit({ value: depositAmount });
        await treasury.connect(owner).withdraw(addr1.address, withdrawAmount);

        expect(await treasury.treasuryETHBalance()).to.equal(depositAmount - withdrawAmount);
    });


    // TODO: 리밸런싱 테스트는 BondingCurve, Reserve, TokenExchange, Treasury 등이 
    //       모두 정상적으로 동작해야 제대로 테스트 가능하므로 추후 테스트

    // /** ✅ 리밸런싱 (Rebalance) 기능 테스트 */
    // it("should allow only the rebalancer to call rebalance", async function () {
    //     const depositAmount = ethers.parseEther("1");

    //     await treasury.connect(owner).setRebalancer(rebalancer.address);
    //     expect(await treasury.rebalancer()).to.equal(rebalancer.address);

    //     await treasury.connect(addr1).deposit({ value: depositAmount });

    //     // 🔍 Exchange, Reserve 컨트랙트 주소 확인
    //     const exchangeAddress = await treasury.exchange();
    //     const reserveAddress = await treasury.reserve();
    //     console.log("🔍 Exchange Contract Address:", exchangeAddress);
    //     console.log("🔍 Reserve Contract Address:", reserveAddress);

    //     // 🔍 Rebalance 전 treasuryETHBalance 로그 확인
    //     const treasuryBalanceBefore = await treasury.treasuryETHBalance();
    //     console.log("🔍 Treasury ETH Balance before rebalance:", treasuryBalanceBefore.toString());

    //     try {
    //         console.log("🔍 Attempting to call rebalance...");
    //         console.log("🔍 Calling exchange.buy() with ETH:", treasuryBalanceBefore.toString());
    //         await treasury.connect(rebalancer).rebalance();
    //     } catch (error) {
    //         console.error("🚨 Rebalance failed with error:", error);
    //     }

    //     // 🔍 Rebalance 후 treasuryETHBalance 로그 확인
    //     const treasuryBalanceAfter = await treasury.treasuryETHBalance();
    //     console.log("🔍 Treasury ETH Balance after rebalance:", treasuryBalanceAfter.toString());
    // });

    /** ✅ Reserve Ratio 업데이트 테스트 */
    it("should allow the owner to update reserve ratio", async function () {
        const newReserveRatio = 20;
        await treasury.connect(owner).updateReserveRatio(newReserveRatio);
        expect(await treasury.reserveRatio()).to.equal(newReserveRatio);
    });

    /** ✅ Rebalancer 설정 테스트 */
    it("should allow the owner to set the rebalancer", async function () {
        await treasury.connect(owner).setRebalancer(rebalancer.address);
        expect(await treasury.rebalancer()).to.equal(rebalancer.address);
    });
});