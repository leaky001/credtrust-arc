const { expect } = require("chai");
const { ethers } = require("hardhat");

const usdc = (amount) => ethers.parseUnits(amount, 6);

describe("USDC reputation integration", function () {
  it("creates, funds, disburses, and repays a USDC loan with a score update", async function () {
    const [borrower, lender] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MockUSDC");
    const token = await Token.deploy();
    const Factory = await ethers.getContractFactory("LoanFactory", borrower);
    const factory = await Factory.deploy(await token.getAddress());

    await token.mint(await borrower.getAddress(), usdc("1000"));
    await token.mint(await lender.getAddress(), usdc("1000"));
    await factory.connect(borrower).createLoan(usdc("1"), 7);
    const loan = await ethers.getContractAt("Loan", await factory.getLoan(0));

    await token.connect(lender).approve(await loan.getAddress(), usdc("1"));
    await loan.connect(lender).fund(usdc("1"));
    expect(await token.balanceOf(await borrower.getAddress())).to.equal(usdc("1001"));

    const repayment = await loan.getTotalRepayment();
    await token.connect(borrower).approve(await loan.getAddress(), repayment);
    await loan.connect(borrower).repay();

    expect(await loan.status()).to.equal(3n);
    const score = await (await ethers.getContractAt("CreditScore", await factory.getCreditScore()))
      .getScore(await borrower.getAddress());
    expect(score).to.equal(540n);
  });
});
