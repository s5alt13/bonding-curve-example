const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GASToken Contract", function () {
    let GASToken, gasToken, owner, addr1, addr2, exchange;

    beforeEach(async function () {
        [owner, addr1, addr2, exchange] = await ethers.getSigners();

        console.log("🚀 Deploying GASToken contract...");
        const GASTokenContract = await ethers.getContractFactory("GASToken");
        gasToken = await GASTokenContract.deploy();
        await gasToken.waitForDeployment();
        console.log("✅ GASToken deployed at:", await gasToken.getAddress());

        // Exchange 주소 설정
        await gasToken.setExchange(exchange.address);
    });

    /** ✅ 기본 정보 확인 */
    it("should deploy with correct initial settings", async function () {
        expect(await gasToken.name()).to.equal("GASToken");
        expect(await gasToken.symbol()).to.equal("GAST");
        expect(await gasToken.decimals()).to.equal(18);
        expect(await gasToken.totalSupply()).to.equal(0);
    });

    /** ✅ ERC-20 transfer 기능 확인 */
    it("should allow token transfers", async function () {
        // Owner -> addr1에게 100 GAST 발행 후 전송
        await gasToken.connect(exchange).mint(owner.address, ethers.parseEther("100"));
        await gasToken.transfer(addr1.address, ethers.parseEther("50"));

        expect(await gasToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("50"));
        expect(await gasToken.balanceOf(owner.address)).to.equal(ethers.parseEther("50"));
    });

    /** ✅ mint() 테스트: onlyExchange modifier 작동 확인 */
    it("should only allow exchange to mint tokens", async function () {
        await expect(gasToken.connect(addr1).mint(addr1.address, ethers.parseEther("10"))).to.be.revertedWith(
            "Reserve: caller is not the exchange"
        );

        // 올바른 exchange가 mint 수행
        await gasToken.connect(exchange).mint(addr1.address, ethers.parseEther("10"));
        expect(await gasToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("10"));
    });

    /** ✅ mint() 테스트: maxSupply 제한 확인 */
    it("should not exceed max supply when minting", async function () {
        const maxSupply = ethers.parseEther("100000000"); // 100M GAST

        // 최대 공급량까지 민팅
        await gasToken.connect(exchange).mint(owner.address, maxSupply);
        expect(await gasToken.totalSupply()).to.equal(maxSupply);

        // 추가 민팅 시 revert
        await expect(gasToken.connect(exchange).mint(owner.address, ethers.parseEther("1"))).to.be.revertedWith(
            "GASToken: Exceeds maximum supply"
        );
    });

    /** ✅ burn() 테스트: onlyExchange modifier 작동 확인 */
    it("should only allow exchange to burn tokens", async function () {
        const mintAmount = ethers.parseEther("10");
        const burnAmount = ethers.parseEther("5");
    
        // 🔍 Exchange 주소 설정
        await gasToken.connect(owner).setExchange(exchange.address);
        console.log(`✅ Exchange set to: ${exchange.address}`);
    
        // 🔍 Exchange가 GAST 토큰을 발행
        await gasToken.connect(exchange).mint(exchange.address, mintAmount);
        console.log(`✅ Minted ${ethers.formatEther(mintAmount)} GAST to Exchange`);
    
        // 🔍 소각 전 Exchange 잔액 확인
        const balanceBefore = await gasToken.balanceOf(exchange.address);
        console.log(`🔍 Exchange Balance Before Burn: ${ethers.formatEther(balanceBefore)} GAST`);
    
        // 🔍 Unauthorized 계정(addr1)이 burn을 시도 (실패해야 함)
        console.log("🔍 Attempting to burn from unauthorized address...");
        await expect(gasToken.connect(addr1).burn(burnAmount)).to.be.revertedWith("Reserve: caller is not the exchange");
    
        // 🔍 Exchange가 burn을 시도 (성공해야 함)
        console.log("🔍 Attempting to burn from authorized exchange...");
        await expect(gasToken.connect(exchange).burn(burnAmount)).to.not.be.reverted;
        console.log("✅ Burn successful!");
    
        // 🔍 소각 후 Exchange 잔액 확인
        const balanceAfter = await gasToken.balanceOf(exchange.address);
        console.log(`🔍 Exchange Balance After Burn: ${ethers.formatEther(balanceAfter)} GAST`);
    
        // ✅ 총 공급량이 burnAmount만큼 감소했는지 확인
        const totalSupplyAfterBurn = await gasToken.totalSupply();
        expect(totalSupplyAfterBurn).to.equal(mintAmount - burnAmount); // 🔥 `.sub()` 대신 `-` 연산 사용
    });

    /** ✅ burnFrom() 테스트: approved address만 소각 가능 */
    it("should allow approved accounts to burn tokens using burnFrom", async function () {
        await gasToken.connect(exchange).mint(owner.address, ethers.parseEther("10"));
        await gasToken.approve(addr1.address, ethers.parseEther("5"));

        await expect(gasToken.connect(addr1).burnFrom(owner.address, ethers.parseEther("5"))).to.emit(
            gasToken,
            "Transfer"
        );

        expect(await gasToken.balanceOf(owner.address)).to.equal(ethers.parseEther("5"));
    });
});