const hre = require("hardhat");

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 5042n) {
    throw new Error(`Refusing deployment on chain ${network.chainId}; Arc Mainnet chain ID is 5042.`);
  }

  const usdcAddress = process.env.ARC_USDC_ADDRESS || process.env.NEXT_PUBLIC_ARC_USDC_ADDRESS;
  if (!usdcAddress || await hre.ethers.provider.getCode(usdcAddress) === "0x") {
    throw new Error("Set ARC_USDC_ADDRESS to a deployed USDC contract on Arc Mainnet.");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const LoanFactory = await hre.ethers.getContractFactory("LoanFactory");
  const factory = await LoanFactory.deploy(usdcAddress);
  await factory.waitForDeployment();

  console.log("LoanFactory deployed to:", await factory.getAddress());
  console.log("CreditScore deployed to:", await factory.getCreditScore());
  console.log("LendingPool deployed to:", await factory.getLendingPool());
  console.log("USDC:", usdcAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
