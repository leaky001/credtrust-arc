// Run a full loan flow end-to-end on local Hardhat network:
// 1) create loan (borrower)
// 2) fund loan (lender)
// 3) repay loan (borrower)
// Usage: npx hardhat run scripts/autoFlow.js --network hardhat

require('dotenv').config({ path: '.env.local' });
const hre = require('hardhat');
const { ethers } = hre;

async function main() {
  const [borrower, lender] = await ethers.getSigners();
  console.log('Borrower:', borrower.address);
  console.log('Lender:', lender.address);

  // Deploy a fresh LoanFactory & CreditScore for this run so addresses are valid
  const Token = await ethers.getContractFactory('MockUSDC');
  const token = await Token.deploy();
  const tokenAddress = await token.getAddress();
  await token.mint(borrower.address, ethers.parseUnits('10', 6));
  await token.mint(lender.address, ethers.parseUnits('10', 6));

  const Factory = await ethers.getContractFactory('LoanFactory');
  console.log('Deploying LoanFactory...');
  const factory = await Factory.deploy(tokenAddress);
  await factory.waitForDeployment?.();
  // Backwards compatibility for older hardhat versions
  if (factory.deployTransaction) await factory.deployed();
  const factoryAddress = await factory.getAddress?.() ?? factory.address;
  const creditScoreAddress = await factory.getCreditScore();
  console.log('LoanFactory deployed to:', factoryAddress);
  console.log('CreditScore deployed to:', creditScoreAddress);

  // Create loan as borrower
  const principal = ethers.parseUnits('1', 6);
  const durationDays = 1;

  console.log('Creating loan...');
  const txCreate = await factory.connect(borrower).createLoan(principal, durationDays);
  await txCreate.wait();
  console.log('Loan created tx:', txCreate.hash);

  const loanCount = await factory.loanCount();
  const loanId = loanCount - 1n;
  const loanAddr = await factory.getLoan(loanId);
  console.log('Loan address:', loanAddr);

  const Loan = await ethers.getContractFactory('Loan');
  const loan = Loan.attach(loanAddr);

  // Fund loan as lender
  console.log('Funding loan with principal:', principal.toString());
  await token.connect(lender).approve(loanAddr, principal);
  const txFund = await loan.connect(lender).fund(principal);
  await txFund.wait();
  console.log('Fund tx:', txFund.hash);

  // Borrower repay total (principal + interest)
  const total = await loan.getTotalRepayment();
  console.log('Total repayment (USDC units):', total.toString());
  await token.connect(borrower).approve(loanAddr, total);
  const txRepay = await loan.connect(borrower).repay();
  await txRepay.wait();
  console.log('Repay tx:', txRepay.hash);

  // Check credit score
  const CreditScore = await ethers.getContractFactory('CreditScore');
  const creditScore = CreditScore.attach(creditScoreAddress);
  const score = await creditScore.getScore(borrower.address);
  console.log('Final credit score for borrower:', score.toString());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
