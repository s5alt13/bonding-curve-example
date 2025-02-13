const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Bonding Curve Test", function () {
    let gasToken, bondingCurve, exchange, treasury, reserve;
    let inputETH = ethers.parseEther("1300");

    beforeEach(async function () {

        // 배포 순서 
        // 1. Reserve 
        // 2. GASToken
        // 3. BondingCurveData, BondingCurve
        // 4. Exchange
        // 5. Treasury <- Exchange address 필요 
        // 6. Exchange.updateTreasury

        const signers = await ethers.getSigners();
        // console.log("🔍 Signers Length:", signers.length); // ✅ signers 배열 길이 체크
        owner = signers[0];
        buyer = signers[1]; // ✅ buyer를 명확하게 할당
        seller = signers[2];
        // console.log("🔍 Assigned Buyer Address:", buyer?.address);
        const balance = await ethers.provider.getBalance(buyer.address); 
        // console.log("🔍 Buyer Initial ETH Balance:", ethers.formatEther(balance), "ETH");
        // console.log("🔍 Buyer Address:", buyer.address); // ✅ buyer 주소 출력
        // const ownerBalance = await ethers.provider.getBalance(owner.address);

        // console.log(`🔍 Owner ETH Balance before sending: ${ethers.formatEther(ownerBalance)} ETH`);

            // 🔹 buyer의 ETH 잔액을 강제로 100만 ETH로 설정
        // await ethers.provider.send("hardhat_setBalance", [
        //     buyer.address,
        //     "0x3635C9ADC5DEA00000", // 1000000 ETH (16진수 표현)
        // ]);


        const ReserveMock = await ethers.getContractFactory("Reserve");
        reserve = await ReserveMock.deploy();
        await reserve.waitForDeployment();

        const GASTokenMock = await ethers.getContractFactory("GASToken");
        gasToken = await GASTokenMock.deploy();
        await gasToken.waitForDeployment();

        const BondingCurveDataLib = await ethers.getContractFactory("BondingCurveData");
        const bondingCurveData = await BondingCurveDataLib.deploy();
        await bondingCurveData.waitForDeployment();

        const bondingCurveDataAddress = await bondingCurveData.getAddress();
        const BondingCurveFactory = await ethers.getContractFactory("BondingCurve", {
            libraries: {
                "contracts/BondingCurveData.sol:BondingCurveData": bondingCurveDataAddress, 
            },
        });
        bondingCurve = await BondingCurveFactory.deploy(gasToken.getAddress());
        await bondingCurve.waitForDeployment();

        const TokenExchangeMock = await ethers.getContractFactory("TokenExchange");
        exchange = await TokenExchangeMock.deploy(
            bondingCurve.getAddress(),
            gasToken.getAddress(),
            reserve.getAddress(),
            ethers.ZeroAddress // Treasury 주소는 아직 없음
        );
        await exchange.waitForDeployment();

        const TreasuryMock = await ethers.getContractFactory("Treasury");
        treasury = await TreasuryMock.deploy(
            reserve.getAddress(),
            gasToken.getAddress(),
            exchange.getAddress()
        );
        await treasury.waitForDeployment();

        await exchange.updateTreasury(treasury.getAddress());
        await gasToken.setExchange(exchange.getAddress());
    })

    it("should deploy contracts with correct initial settings", async function () {
        expect(await treasury.reserve()).to.equal(await reserve.getAddress());
        expect(await treasury.gasToken()).to.equal(await gasToken.getAddress());
        expect(await treasury.exchange()).to.equal(await exchange.getAddress());
        // expect(await treasury.reserveRatio).to.equal(initialReserveRatio);
        expect(await treasury.treasuryETHBalance()).to.equal(0);
    
        expect(await exchange.reserve()).to.equal(await reserve.getAddress());
        expect(await exchange.gasToken()).to.equal(await gasToken.getAddress());
        expect(await exchange.treasury()).to.equal(await treasury.getAddress());
    
        expect(await bondingCurve.gasToken()).to.equal(await gasToken.getAddress());
    
        // console.log("\n✅ All contract addresses verified successfully!");
    });

    it("Should correctly interpolate price after multiple buys", async function () {
        // console.log("Reserve Address:", reserve ? reserve.target : "Not deployed");
        // console.log("Treasury Address:", treasury ? treasury.target : "Not deployed");

        const balance = await ethers.provider.getBalance(buyer.address);
        console.log("🔍 Buyer ETH Balance:", ethers.formatEther(balance), "ETH");
        
        const MAX_SUPPLY = 100000000; // 1억 GAST (0 decimals)

        for (let i = 1; i <= 500; i++) {
            // 💡 매 반복마다 다시 가져옴
            const reserveInstance = await ethers.getContractAt("Reserve", reserve.target);
            const treasuryInstance = await ethers.getContractAt("Treasury", treasury.target);
        
            // console.log("Reserve Address:", reserveInstance.target);
            // console.log("Treasury Address:", treasuryInstance.target);
        
            await exchange.connect(buyer).buy({ value: inputETH });
            console.log(`🔹 Iteration ${i}: Buying 1300 ETH worth of GAST`);
        
            const supply = await gasToken.totalSupply();
            const reserveBalance = await ethers.provider.getBalance(reserveInstance.target);
            const treasuryBalance = await ethers.provider.getBalance(treasuryInstance.target);
        
            console.log(`🔍 Current total supply after ${i} buys:`, supply.toString());
            console.log(`🏦 Reserve ETH Balance: ${ethers.formatEther(reserveBalance)} ETH`);
            console.log(`💰 Treasury ETH Balance: ${ethers.formatEther(treasuryBalance)} ETH`);
        
            // 1억 개 이상이면 종료
            if (supply >= MAX_SUPPLY) {
                console.log("🎯 ---------------------------------------------");
                console.log("🎯 | Supply reached 100 million, stopping loop. |");
                console.log("🎯 ---------------------------------------------");
                break;
            }
        }

        // ✅ Buyer가 Seller에게 1억 개 GAST 전송
        const buyerGastBalance = await gasToken.balanceOf(buyer.address);
        console.log(`🚀 Buyer GAST Balance before transfer: ${buyerGastBalance.toString()}`);

        // 🔹 Buyer가 Reserve에 10,000 ETH 입금. 
        const depositAmount = ethers.parseEther("10000"); // 10,000 ETH
        await reserve.connect(buyer).deposit({ value: depositAmount });
        console.log(`✅ Buyer deposited ${ethers.formatEther(depositAmount)} ETH into Reserve`);
        const reserveBalance = await ethers.provider.getBalance(reserve.target);
        console.log(`🏦 Reserve ETH Balance after deposit: ${ethers.formatEther(reserveBalance)} ETH`);

        await gasToken.connect(buyer).transfer(seller.address, MAX_SUPPLY);
        console.log(`✅ Buyer transferred ${MAX_SUPPLY} GAST to Seller`);

        const sellerGastBalance = await gasToken.balanceOf(seller.address);
        console.log(`🚀 Seller GAST Balance after transfer: ${sellerGastBalance.toString()}`);

            // 3️⃣ 1억 개 → 0개까지 `sell()`
        const SELL_BATCH_SIZE = 500000; // 50만 개씩 판매

        let totalWithdrawnETH = ethers.parseEther("0"); // 누적 출금 ETH 추적

        for (let i = 1; i <= 1000; i++) {
            const reserveInstance = await ethers.getContractAt("Reserve", reserve.target);
            const treasuryInstance = await ethers.getContractAt("Treasury", treasury.target);

            // 🚀 Buyer → Seller에게 1억 개 토큰 전송 후, Seller가 TokenExchange에 소각 권한 부여
            await gasToken.connect(seller).approve(exchange.target, ethers.parseUnits("100000000", 0));
            console.log("✅ Seller approved 100M GAST for exchange contract");

                // 남은 GAST가 50만 개보다 적으면 남은 수량만큼 판매
            const sellAmount = sellerGastBalance < SELL_BATCH_SIZE ? sellerGastBalance : SELL_BATCH_SIZE;

            const initialReserveBalance = await ethers.provider.getBalance(reserveInstance.target);

            await exchange.connect(seller).sell(sellAmount);
            console.log(`🔹 Iteration ${i}: Selling GAST`);

            const finalReserveBalance = await ethers.provider.getBalance(reserveInstance.target);
            const withdrawnETH = initialReserveBalance - finalReserveBalance;
            totalWithdrawnETH += withdrawnETH; // 누적 출금액 업데이트


            const supply = await gasToken.totalSupply();
            const reserveBalance = await ethers.provider.getBalance(reserveInstance.target);
            const treasuryBalance = await ethers.provider.getBalance(treasuryInstance.target);

            console.log(`🔍 Current total supply after ${i} sells:`, supply.toString());
            console.log(`🏦 Reserve ETH Balance: ${ethers.formatEther(reserveBalance)} ETH`);
            console.log(`💰 Treasury ETH Balance: ${ethers.formatEther(treasuryBalance)} ETH`);
            console.log(`💸 Withdrawn ETH in this iteration: ${ethers.formatEther(withdrawnETH)} ETH`);
            console.log(`💰 Total Withdrawn ETH so far: ${ethers.formatEther(totalWithdrawnETH)} ETH`);

            // 🔴 1. 전체 GAST 공급량이 0 이하가 되면 종료
            if (supply <= 0) {
                console.log("🎯 ------------------------------------------");
                console.log("🎯 | All GAST has been sold. Stopping loop.  |");
                console.log("🎯 ------------------------------------------");
                break;
            }

            // 🔴 2. Seller의 GAST 보유량이 0이 되면 종료
            if (sellerGastBalance <= 0) {
                console.log("❌ Seller has no more GAST to sell. Stopping loop.");
                break;
            }
        }

    })
});