// Pre-flight check script — read-only, no deployment
// Does NOT print private key or secret values
require("dotenv").config({ path: [".env.local", ".env"] });
const { ethers } = require("ethers");

async function main() {
  const rpc = process.env.ARC_RPC_URL || "https://rpc.mainnet.arc.io";
  const pk = process.env.PRIVATE_KEY;
  const usdcAddress = process.env.ARC_USDC_ADDRESS || process.env.NEXT_PUBLIC_ARC_USDC_ADDRESS;

  console.log("\n========== PRE-FLIGHT CHECK ==========");

  // 1. Required env vars
  console.log("\n[1] Environment variables:");
  console.log("  PRIVATE_KEY        :", pk ? "[SET]" : "[MISSING]");
  console.log("  ARC_USDC_ADDRESS   :", usdcAddress || "[MISSING]");
  console.log("  ARC_RPC_URL        :", rpc);
  console.log("  ARC_CHAIN_ID       :", process.env.ARC_CHAIN_ID || "5042 (default)");

  if (!pk) {
    console.error("\n❌ PRIVATE_KEY is not set in .env.local. Aborting.");
    process.exit(1);
  }
  if (!usdcAddress) {
    console.error("\n❌ ARC_USDC_ADDRESS is not set. Aborting.");
    process.exit(1);
  }

  // 2. Connect to Arc Mainnet
  console.log("\n[2] Connecting to Arc Mainnet...");
  const provider = new ethers.JsonRpcProvider(rpc);
  const network = await provider.getNetwork();
  console.log("  Connected chain ID :", network.chainId.toString());
  if (network.chainId !== 5042n) {
    console.error(`❌ Wrong chain ID ${network.chainId} — expected 5042. Aborting.`);
    process.exit(1);
  }
  console.log("  ✅ Chain ID 5042 confirmed");

  // 3. Derive deployer address WITHOUT printing the key
  const wallet = new ethers.Wallet(pk, provider);
  const address = wallet.address;
  console.log("\n[3] Deployer wallet:");
  console.log("  Address            :", address);

  // 4. Check native (gas) balance
  const nativeBal = await provider.getBalance(address);
  const nativeEth = ethers.formatEther(nativeBal);
  console.log("  Native balance     :", nativeEth, "ARC (for gas)");

  // 5. Check USDC contract exists on-chain
  console.log("\n[4] USDC contract on Arc Mainnet:");
  const code = await provider.getCode(usdcAddress);
  if (code === "0x") {
    console.error("  ❌ No contract code at", usdcAddress);
  } else {
    console.log("  ✅ Contract found at", usdcAddress);
    // Try to read deployer USDC balance
    try {
      const usdc = new ethers.Contract(usdcAddress, [
        "function balanceOf(address) view returns (uint256)",
        "function decimals() view returns (uint8)"
      ], provider);
      const decimals = await usdc.decimals();
      const usdcBal = await usdc.balanceOf(address);
      console.log("  Deployer USDC bal  :", ethers.formatUnits(usdcBal, decimals), "USDC");
    } catch {
      console.log("  (Could not read USDC balance — ERC-20 interface may differ)");
    }
  }

  // 6. Gas estimate advisory
  console.log("\n[5] Gas assessment:");
  if (nativeBal === 0n) {
    console.error("  ❌ STOP: Deployer wallet has 0 ARC. You need ARC tokens to pay gas.");
    console.log("     Fund the deployer address shown above before deploying.");
    process.exit(1);
  } else if (nativeBal < ethers.parseEther("0.05")) {
    console.warn("  ⚠️  Balance is low. Deployment of 3 contracts may fail. Recommend ≥ 0.05 ARC.");
  } else {
    console.log("  ✅ Balance looks sufficient for deployment.");
  }

  console.log("\n======================================");
  console.log("✅ Pre-flight PASSED — ready to deploy");
  console.log("======================================\n");
}

main().catch((err) => {
  console.error("\n❌ Pre-flight error:", err.message);
  process.exit(1);
});
