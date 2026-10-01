const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Load .env.local manually since dotenv defaults to .env
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, { encoding: "utf8" });
    raw.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^([^=]+)=([\s\S]*)$/);
      if (match) process.env[match[1]] = match[2];
    });
  }

  const factoryAddress = process.env.NEXT_PUBLIC_LOAN_FACTORY_ADDRESS;
  if (!factoryAddress) {
    throw new Error("Missing NEXT_PUBLIC_LOAN_FACTORY_ADDRESS in .env.local");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("Seeding pool using account:", deployer.address);

  const Factory = await hre.ethers.getContractAt("LoanFactory", factoryAddress);
  const poolAddress = await Factory.getLendingPool();
  console.log("Found LendingPool at:", poolAddress);

  const Pool = await hre.ethers.getContractAt("LendingPool", poolAddress);
  
  const usdcAddress = process.env.ARC_USDC_ADDRESS || process.env.NEXT_PUBLIC_ARC_USDC_ADDRESS;
  if (!usdcAddress) throw new Error("Set ARC_USDC_ADDRESS to the configured USDC contract.");
  const amountToSeed = hre.ethers.parseUnits("5", 6);
  const token = await hre.ethers.getContractAt(
    ["function approve(address spender, uint256 amount) returns (bool)"],
    usdcAddress,
  );
  console.log(`Approving and depositing ${hre.ethers.formatUnits(amountToSeed, 6)} USDC...`);

  await (await token.approve(poolAddress, amountToSeed)).wait();
  const tx = await Pool.deposit(amountToSeed);
  await tx.wait();

  console.log("✅ Successfully seeded the LendingPool!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
