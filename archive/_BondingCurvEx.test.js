const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BondingCurve", function () {
  let BondingCurveToken, curve, owner, addr1, addr2;

  beforeEach(async function () {
    // 컨트랙트를 배포하고 필요한 Signer들을 가져옵니다.
    BondingCurve = await ethers.getContractFactory("BondingCurve");
    curve = await BondingCurve.deploy();
    console.log("Contract deployed to:", curve.target || curve.address);
    [owner, addr1, addr2] = await ethers.getSigners();
  });

  it("Should allow users to buy tokens and increase reserve and price", async function () {
    const initialPrice = await curve.tokenPrice(); // 초기 토큰 가격을 가져옵니다.
    const initialReserve = await curve.getReserve(); // 초기 리저브 값을 가져옵니다.

    // addr1이 buyTokens를 호출하며 1 ETH를 전송
    await curve.connect(addr1).buyTokens({ value: ethers.parseEther("1") });

    // addr1의 잔액 확인
    const balance = await curve.balanceOf(addr1.address);
    // addr1의 잔액이 100 BCT인지 확인 (1 ETH / 초기 가격 0.01 ETH = 100 BCT)
    expect(balance.toString()).to.equal(ethers.parseUnits("100", 18).toString());

    const updatedReserve = await curve.getReserve();
    const updatedPrice = await curve.tokenPrice();

    // 리저브가 1 ETH 증가했는지 확인
    expect(updatedReserve).to.equal(initialReserve + ethers.parseEther("1"));

    // 토큰 가격이 0.001 ETH 증가했는지 확인
    expect(updatedPrice).to.equal(initialPrice + ethers.parseEther("0.001"));
  });

  it("Should allow users to sell tokens and decrease reserve and price", async function () {
    await curve.connect(addr1).buyTokens({ value: ethers.parseEther("1") }); // 1 ETH로 100 BCT 구매

    await curve.connect(addr1).sellTokens(ethers.parseUnits("50", 18)); // 50 BCT 판매

    const balance = await curve.balanceOf(addr1.address);
    // addr1의 잔액이 50 BCT인지 확인 (100 BCT - 50 BCT)
    expect(balance).to.equal(ethers.parseUnits("50", 18));

    const updatedReserve = await curve.getReserve();
    // 리저브가 0.55 ETH 감소했는지 확인 (1 ETH - 0.55 ETH = 0.45 ETH)
    expect(updatedReserve).to.equal(BigInt(ethers.parseEther("0.45")));

    const updatedPrice = await curve.tokenPrice();
    // 토큰 가격이 0.001 ETH 감소했는지 확인 (0.011 ETH - 0.001 ETH = 0.01 ETH)
    expect(updatedPrice).to.equal(BigInt(ethers.parseEther("0.01")));
  });

  it("Should fail to sell tokens if user does not have enough balance", async function () {
    // addr1이 잔액 없이 sellTokens 호출 -> 실패하는지 확인
    await expect(
      curve.connect(addr1).sellTokens(ethers.parseUnits("10", 18))
    ).to.be.revertedWith("Insufficient token balance"); // "잔액 부족" 에러 발생
  });

  it("Should fail to sell tokens if reserve does not have enough ETH", async function () {
    await curve.connect(addr1).buyTokens({ value: ethers.parseEther("5") }); // 5 ETH로 500 BCT 구매

    await curve.connect(owner).withdrawETH(ethers.parseEther("4.9")); // 리저브를 0.1 ETH로 줄임

    // 리저브가 부족한 상태에서 200 BCT 판매 시도 -> 실패하는지 확인
    await expect(
      curve.connect(addr1).sellTokens(ethers.parseUnits("200", 18))
    ).to.be.revertedWith("Not enough ETH in reserve"); // "리저브 부족" 에러 발생
  });

  it("Should increase and decrease token price correctly", async function () {
    const initialPrice = await curve.tokenPrice(); // 초기 가격 확인

    await curve.connect(addr1).buyTokens({ value: ethers.parseEther("1") }); // 1 ETH로 100 BCT 구매
    const increasedPrice = await curve.tokenPrice();
    // 구매 후 가격이 0.001 ETH 증가했는지 확인
    expect(increasedPrice).to.equal(initialPrice + BigInt(ethers.parseEther("0.001")));

    await curve.connect(addr1).sellTokens(ethers.parseUnits("50", 18)); // 50 BCT 판매
    const decreasedPrice = await curve.tokenPrice();
    // 판매 후 가격이 다시 초기 가격으로 돌아왔는지 확인
    expect(decreasedPrice).to.equal(initialPrice);
  });
});

    // TIP: 여러가지 상호작용을 하는 컨트랙트를 테스트할 경우,
    // - Mock으로 임시 컨트랙트를 만들고, 이 기능을 하는 가상의 컨트랙트를 만들고 주소를 생성할 수 있다.
    // - 상호작용 하는 컨트랙트의 주소를 전달해줘야 할때는 Mock으로 생성된 주소를 생성자로 전달해줘야 한다.
    // - 여기서 어떤 컨트랙트가 먼저 배포될지 순서도 같이 정해져야 한다.

    // TIP: try catch를 통해서 테스트를 통과시킨 후 에러 처리를 할 수 있음

    // TIP: 몇몇 테스트들은 나중에 해야 한다. 예. 트레저리 리밸런싱 같은 것은 많은 컨트랙트의 상호작용으로 이루어지므로 나중에 테스트 하는게 맞다. 