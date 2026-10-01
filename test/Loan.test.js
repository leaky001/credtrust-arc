const { expect } = require("chai");
const { ethers, network } = require("hardhat");

const usdc = (amount) => ethers.parseUnits(amount, 6);

describe("CredTrust USDC protocol", function () {
  let token;
  let factory;
  let pool;
  let creditScore;
  let borrower;
  let lenderA;
  let lenderB;

  async function createLoan(amount, durationDays = 7) {
    await factory.connect(borrower).createLoan(usdc(amount), durationDays);
    const loanAddress = await factory.getLoan((await factory.loanCount()) - 1n);
    return ethers.getContractAt("Loan", loanAddress);
  }

  async function fundLoan(loan, lender, amount) {
    await token.connect(lender).approve(await loan.getAddress(), amount);
    await loan.connect(lender).fund(amount);
  }

  beforeEach(async function () {
    [borrower, lenderA, lenderB] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockUSDC");
    token = await Token.deploy();
    const Factory = await ethers.getContractFactory("LoanFactory");
    factory = await Factory.deploy(await token.getAddress());
    pool = await ethers.getContractAt("LendingPool", await factory.getLendingPool());
    creditScore = await ethers.getContractAt("CreditScore", await factory.getCreditScore());

    for (const signer of [borrower, lenderA, lenderB]) {
      await token.mint(await signer.getAddress(), usdc("10000"));
    }
  });

  it("creates a six-decimal USDC loan and records the borrower request", async function () {
    expect(await token.decimals()).to.equal(6n);
    const loan = await createLoan("125.123456", 30);

    expect(await loan.borrower()).to.equal(await borrower.getAddress());
    expect(await loan.principal()).to.equal(usdc("125.123456"));
    expect(await loan.status()).to.equal(0n);
    expect((await creditScore.records(await borrower.getAddress())).totalLoans).to.equal(1n);
    expect(await creditScore.getScore(await borrower.getAddress())).to.equal(500n);
  });

  it("requires USDC allowance, supports partial funding, and disburses only when filled", async function () {
    const loan = await createLoan("100");
    const borrowerBefore = await token.balanceOf(await borrower.getAddress());

    await expect(loan.connect(lenderA).fund(usdc("40")))
      .to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance");

    await fundLoan(loan, lenderA, usdc("40"));
    expect(await loan.totalFunded()).to.equal(usdc("40"));
    expect(await loan.status()).to.equal(0n);
    expect(await token.balanceOf(await borrower.getAddress())).to.equal(borrowerBefore);

    await fundLoan(loan, lenderB, usdc("60"));
    expect(await loan.status()).to.equal(2n);
    expect(await token.balanceOf(await borrower.getAddress()) - borrowerBefore).to.equal(usdc("100"));
  });

  it("collects repayment, distributes principal and interest, and updates credit score", async function () {
    const loan = await createLoan("100");
    await fundLoan(loan, lenderA, usdc("40"));
    await fundLoan(loan, lenderB, usdc("60"));

    const totalRepayment = await loan.getTotalRepayment();
    expect(totalRepayment).to.equal(usdc("112"));
    const lenderABefore = await token.balanceOf(await lenderA.getAddress());
    const lenderBBefore = await token.balanceOf(await lenderB.getAddress());
    await token.connect(borrower).approve(await loan.getAddress(), totalRepayment);
    await loan.connect(borrower).repay();

    expect(await loan.status()).to.equal(3n);
    expect(await token.balanceOf(await lenderA.getAddress()) - lenderABefore).to.equal(usdc("44.8"));
    expect(await token.balanceOf(await lenderB.getAddress()) - lenderBBefore).to.equal(usdc("67.2"));
    expect(await creditScore.getScore(await borrower.getAddress())).to.equal(540n);
  });

  it("marks a default and reduces the score from its base", async function () {
    const loan = await createLoan("10", 1);
    await fundLoan(loan, lenderA, usdc("10"));
    await network.provider.send("evm_increaseTime", [4 * 24 * 60 * 60 + 1]);
    await network.provider.send("evm_mine");

    await loan.connect(lenderB).markDefaulted();
    expect(await loan.status()).to.equal(4n);
    expect(await creditScore.getScore(await borrower.getAddress())).to.equal(450n);
  });

  it("clamps scores to zero after penalties exceed the base score", async function () {
    const loans = [];
    for (let index = 0; index < 11; index += 1) loans.push(await createLoan("1", 1));
    for (const loan of loans) await fundLoan(loan, lenderA, usdc("1"));

    await network.provider.send("evm_increaseTime", [4 * 24 * 60 * 60 + 1]);
    await network.provider.send("evm_mine");
    for (const loan of loans) await loan.connect(lenderB).markDefaulted();

    expect(await creditScore.getScore(await borrower.getAddress())).to.equal(0n);
  });

  it("preserves the borrower and values outstanding pool principal and realized interest", async function () {
    const deposit = usdc("1000");
    await token.connect(lenderA).approve(await pool.getAddress(), deposit);
    await pool.connect(lenderA).deposit(deposit);
    const assetsBeforeBorrow = await pool.totalAssets();
    const borrowerBefore = await token.balanceOf(await borrower.getAddress());

    await factory.connect(borrower).borrowFromPool(usdc("100"), 7);
    const loan = await ethers.getContractAt("Loan", await factory.getLoan(0));

    expect(await loan.borrower()).to.equal(await borrower.getAddress());
    expect(await loan.status()).to.equal(2n);
    expect(await token.balanceOf(await borrower.getAddress()) - borrowerBefore).to.equal(usdc("100"));
    expect(await pool.totalReceivables()).to.equal(usdc("100"));
    expect(await pool.totalAssets()).to.equal(assetsBeforeBorrow);

    const repayment = await loan.getTotalRepayment();
    await token.connect(borrower).approve(await loan.getAddress(), repayment);
    await loan.connect(borrower).repay();
    expect(await pool.totalReceivables()).to.equal(0n);
    expect(await pool.totalAssets()).to.equal(assetsBeforeBorrow + usdc("12"));
    expect(await creditScore.getScore(await borrower.getAddress())).to.equal(540n);
  });

  it("writes down pool receivables when a pool-funded loan defaults", async function () {
    const deposit = usdc("1000");
    await token.connect(lenderA).approve(await pool.getAddress(), deposit);
    await pool.connect(lenderA).deposit(deposit);
    await factory.connect(borrower).borrowFromPool(usdc("100"), 1);
    expect(await pool.totalAssets()).to.equal(deposit);

    await network.provider.send("evm_increaseTime", [4 * 24 * 60 * 60 + 1]);
    await network.provider.send("evm_mine");
    await factory.markLoanDefaulted(0);

    expect(await pool.totalReceivables()).to.equal(0n);
    expect(await pool.totalAssets()).to.equal(usdc("900"));
    expect(await creditScore.getScore(await borrower.getAddress())).to.equal(450n);
  });
});
