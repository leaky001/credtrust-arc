// READ-ONLY on-chain verification — no transactions
require("dotenv").config({ path: [".env.local", ".env"] });
const { ethers } = require("ethers");

const RPC = "https://rpc.mainnet.arc.io";

const ADDRESSES = {
  loanFactory:  "0xaD6C2f8102f25174993c2Ea22364d0ffF761c49E",
  creditScore:  "0x197EfAF592BB9E9E15148DC2Bb8C96Ad688bedc6",
  lendingPool:  "0x29a6be84be960a18c1E911844D80d9607D5001E5",
  usdc:         "0x3600000000000000000000000000000000000000",
};

const FACTORY_ABI = [
  "function getCreditScore() view returns (address)",
  "function getLendingPool() view returns (address)",
  "function usdc() view returns (address)",
];
const POOL_ABI = [
  "function usdc() view returns (address)",
  "function totalAssets() view returns (uint256)",
];
const USDC_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
];

async function check(label, fn) {
  try {
    const result = await fn();
    console.log(`  ✅ ${label}: ${result}`);
    return result;
  } catch (e) {
    console.log(`  ❌ ${label}: ${e.message}`);
    return null;
  }
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);

  console.log("\n========== ON-CHAIN VERIFICATION ==========");

  // 1. Network
  console.log("\n[1] Network:");
  const network = await provider.getNetwork();
  console.log(`  Chain ID: ${network.chainId} ${network.chainId === 5042n ? "✅" : "❌ expected 5042"}`);

  // 2. Bytecode check
  console.log("\n[2] Bytecode present:");
  for (const [name, addr] of Object.entries(ADDRESSES)) {
    const code = await provider.getCode(addr);
    console.log(`  ${name.padEnd(14)}: ${addr} — ${code !== "0x" ? "✅ contract" : "❌ NO CODE"}`);
  }

  // 3. LoanFactory linkage
  console.log("\n[3] LoanFactory internal linkage:");
  const factory = new ethers.Contract(ADDRESSES.loanFactory, FACTORY_ABI, provider);
  const csFromFactory  = await check("getCreditScore()", () => factory.getCreditScore());
  const lpFromFactory  = await check("getLendingPool()", () => factory.getLendingPool());

  if (csFromFactory) {
    const match = csFromFactory.toLowerCase() === ADDRESSES.creditScore.toLowerCase();
    console.log(`  CreditScore match : ${match ? "✅" : "❌ MISMATCH — got " + csFromFactory}`);
  }
  if (lpFromFactory) {
    const match = lpFromFactory.toLowerCase() === ADDRESSES.lendingPool.toLowerCase();
    console.log(`  LendingPool match : ${match ? "✅" : "❌ MISMATCH — got " + lpFromFactory}`);
  }

  // 4. Factory USDC
  console.log("\n[4] USDC address in LoanFactory:");
  const factoryUsdc = await check("usdc()", () => factory.usdc());
  if (factoryUsdc) {
    const match = factoryUsdc.toLowerCase() === ADDRESSES.usdc.toLowerCase();
    console.log(`  USDC match        : ${match ? "✅" : "❌ MISMATCH — got " + factoryUsdc}`);
  }

  // 5. LendingPool USDC
  console.log("\n[5] USDC address in LendingPool:");
  const pool = new ethers.Contract(ADDRESSES.lendingPool, POOL_ABI, provider);
  const poolUsdc = await check("usdc()", () => pool.usdc());
  if (poolUsdc) {
    const match = poolUsdc.toLowerCase() === ADDRESSES.usdc.toLowerCase();
    console.log(`  USDC match        : ${match ? "✅" : "❌ MISMATCH — got " + poolUsdc}`);
  }
  await check("totalAssets()", () => pool.totalAssets().then(v => ethers.formatUnits(v, 6) + " USDC"));

  // 6. USDC contract info
  console.log("\n[6] USDC contract:");
  const usdc = new ethers.Contract(ADDRESSES.usdc, USDC_ABI, provider);
  await check("symbol()",      () => usdc.symbol());
  await check("decimals()",    () => usdc.decimals());
  await check("totalSupply()", () => usdc.totalSupply().then(v => ethers.formatUnits(v, 6) + " USDC"));

  // 7. .env.local check
  console.log("\n[7] .env.local frontend addresses:");
  const envKeys = {
    NEXT_PUBLIC_LOAN_FACTORY_ADDRESS:  ADDRESSES.loanFactory,
    NEXT_PUBLIC_CREDIT_SCORE_ADDRESS:  ADDRESSES.creditScore,
    NEXT_PUBLIC_LENDING_POOL_ADDRESS:  ADDRESSES.lendingPool,
    NEXT_PUBLIC_USDC_ADDRESS:          ADDRESSES.usdc,
    NEXT_PUBLIC_ARC_USDC_ADDRESS:      ADDRESSES.usdc,
    NEXT_PUBLIC_ARC_CHAIN_ID:          "5042",
    NEXT_PUBLIC_ARC_RPC_URL:           "https://rpc.mainnet.arc.io",
  };
  for (const [k, expected] of Object.entries(envKeys)) {
    const val = process.env[k] || "";
    const match = val.toLowerCase() === expected.toLowerCase();
    console.log(`  ${match ? "✅" : "❌"} ${k}`);
    if (!match) console.log(`       expected: ${expected}\n       got:      ${val || "[EMPTY]"}`);
  }

  console.log("\n============================================\n");
}

main().catch(e => { console.error("❌ Fatal:", e.message); process.exit(1); });
