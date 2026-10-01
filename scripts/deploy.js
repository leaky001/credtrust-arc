const hre = require("hardhat");

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  let usdcAddress;

  if (network.chainId === 31337n) {
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const mockUsdc = await MockUSDC.deploy();
    await mockUsdc.waitForDeployment();
    usdcAddress = await mockUsdc.getAddress();
    console.log("Local MockUSDC deployed to:", usdcAddress);
  } else if (network.chainId === 5042n) {
    usdcAddress = process.env.ARC_USDC_ADDRESS || process.env.NEXT_PUBLIC_ARC_USDC_ADDRESS;
    if (!usdcAddress) {
      throw new Error("Set ARC_USDC_ADDRESS to the verified Arc USDC contract address before deploying.");
    }

    const usdcCode = await hre.ethers.provider.getCode(usdcAddress);
    if (usdcCode === "0x") {
      throw new Error(`No contract code found at configured USDC address ${usdcAddress}.`);
    }
  } else {
    throw new Error(`Refusing deployment on chain ${network.chainId}; Arc Mainnet chain ID is 5042.`);
  }

  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  if (!deployer) {
    throw new Error("No deployer found. Check if the private key is configured correctly in hardhat.config.js and .env");
  }
  console.log("Deploying with account:", deployer.address);

  const LoanFactory = await hre.ethers.getContractFactory("LoanFactory");
  const factory = await LoanFactory.deploy(usdcAddress);
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  const creditScoreAddress = await factory.getCreditScore();
  const lendingPoolAddress = await factory.getLendingPool();

  console.log("\n=========================================");
  console.log("CredTrust Deployment Summary");
  console.log("=========================================");
  console.log("Arc Network / Chain ID: ", network.chainId.toString());
  console.log("Deployer account:       ", deployer.address);
  console.log("LoanFactory address:    ", factoryAddress);
  console.log("CreditScore address:    ", creditScoreAddress);
  console.log("LendingPool address:    ", lendingPoolAddress);
  console.log("USDC address:           ", usdcAddress);
  console.log("=========================================\n");

  console.log("Suggested .env.local entries:");
  const envLines = [
    `NEXT_PUBLIC_LOAN_FACTORY_ADDRESS=${factoryAddress}`,
    `NEXT_PUBLIC_CREDIT_SCORE_ADDRESS=${creditScoreAddress}`,
    `NEXT_PUBLIC_LENDING_POOL_ADDRESS=${lendingPoolAddress}`,
    `NEXT_PUBLIC_USDC_ADDRESS=${usdcAddress}`,
    `NEXT_PUBLIC_ARC_USDC_ADDRESS=${usdcAddress}`,
    `NEXT_PUBLIC_ARC_CHAIN_ID=${network.chainId}`,
    `NEXT_PUBLIC_ARC_RPC_URL=${network.chainId === 31337n ? "http://127.0.0.1:8545" : "https://rpc.mainnet.arc.io"}`,
  ];
  envLines.forEach((l) => console.log(l));

  // Optionally write these entries to .env.local to make local frontend dev easier.
  // Use either the --write-env CLI flag or the WRITE_ENV=true env var.
  const writeEnvFlag = process.argv.includes("--write-env") || process.env.WRITE_ENV === "true";
  if (writeEnvFlag) {
    const fs = require("fs");
    const path = require("path");
    const envPath = path.resolve(process.cwd(), ".env.local");
    // Read existing file (if any) and preserve other keys
    let existing = {};
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, { encoding: "utf8" });
      raw.split(/\r?\n/).forEach((line) => {
        const m = line.match(/^([^=]+)=([\s\S]*)$/);
        if (m) existing[m[1]] = m[2];
      });
    }
    envLines.forEach((line) => {
      const [k, v] = line.split("=");
      existing[k] = v;
    });
    const out = Object.keys(existing)
      .map((k) => `${k}=${existing[k]}`)
      .join("\n") + "\n";
    fs.writeFileSync(envPath, out, { encoding: "utf8" });
    console.log(`Wrote NEXT_PUBLIC_* entries to ${envPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
