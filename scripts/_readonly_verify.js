/**
 * Read-only on-chain verification script.
 * No transactions. No state changes. No private key required.
 */
const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });
const { ethers } = require("ethers");

const RPC = process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.mainnet.arc.io";

const ADDRESSES = {
  LoanFactory:  "0xaD6C2f8102f25174993c2Ea22364d0ffF761c49E",
  CreditScore:  "0x197EfAF592BB9E9E15148DC2Bb8C96Ad688bedc6",
  LendingPool:  "0x29a6be84be960a18c1E911844D80d9607D5001E5",
  USDC:         "0x3600000000000000000000000000000000000000",
};

// Minimal ABIs — read only, matching the actual deployed contracts
const FACTORY_ABI = [
  // LoanFactory: creditScore is a public state var returning its address
  "function creditScore() view returns (address)",
  // LoanFactory: loanCount() returns loans.length
  "function loanCount() view returns (uint256)",
  // LoanFactory: listLoans() returns all loan addresses
  "function listLoans() view returns (address[])",
  // LoanFactory: getCreditScore() is an explicit view getter
  "function getCreditScore() view returns (address)",
];
const CREDIT_ABI = [
  "function getScore(address) view returns (uint256)",
];
const POOL_ABI = [
  // LendingPool: usdc is a public immutable IERC20
  "function usdc() view returns (address)",
  // LendingPool: totalShares is a public uint256
  "function totalShares() view returns (uint256)",
  // LendingPool: totalAssets() is a public view
  "function totalAssets() view returns (uint256)",
  // LendingPool: totalReceivables is a public uint256
  "function totalReceivables() view returns (uint256)",
  // LendingPool: name() sanity check
  "function name() view returns (string)",
];
const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);

  // 1. Chain ID
  const network = await provider.getNetwork();
  const chainId = network.chainId.toString();
  const expectedChainId = "5042";
  console.log("\n=== ARC NETWORK ===");
  console.log(`  Chain ID: ${chainId}  [${chainId === expectedChainId ? "✓ CORRECT (Arc Mainnet)" : "✗ WRONG — expected " + expectedChainId}]`);

  // 2. Bytecode check for all four contracts
  console.log("\n=== CONTRACT BYTECODE ===");
  for (const [name, addr] of Object.entries(ADDRESSES)) {
    const code = await provider.getCode(addr);
    const present = code !== "0x";
    console.log(`  ${name} (${addr}): ${present ? "✓ PRESENT (" + (code.length / 2 - 1) + " bytes)" : "✗ MISSING — no bytecode"}`);
  }

  // 3. USDC symbol/decimals
  console.log("\n=== USDC TOKEN ===");
  try {
    const usdc = new ethers.Contract(ADDRESSES.USDC, ERC20_ABI, provider);
    const symbol   = await usdc.symbol();
    const decimals = await usdc.decimals();
    const supply   = await usdc.totalSupply();
    console.log(`  Symbol:   ${symbol}`);
    console.log(`  Decimals: ${decimals}  [${decimals === 6n ? "✓ correct" : "✗ unexpected"}]`);
    console.log(`  Total Supply: ${ethers.formatUnits(supply, 6)} USDC`);
  } catch (e) {
    console.log(`  ✗ USDC read failed: ${e.message}`);
  }

  // 4. LoanFactory wiring
  console.log("\n=== LOAN FACTORY ===");
  try {
    const factory = new ethers.Contract(ADDRESSES.LoanFactory, FACTORY_ABI, provider);
    // getCreditScore() is an explicit view function on LoanFactory
    const wiredScore = await factory.getCreditScore();
    const loanCount  = await factory.loanCount();
    const loans      = await factory.listLoans();
    const wiredOk = wiredScore.toLowerCase() === ADDRESSES.CreditScore.toLowerCase();
    console.log(`  getCreditScore():  ${wiredScore}  [${wiredOk ? "✓ matches CreditScore" : "✗ MISMATCH"}]`);
    console.log(`  loanCount():       ${loanCount.toString()}`);
    console.log(`  listLoans():       ${loans.length} loan(s) registered`);
  } catch (e) {
    console.log(`  ✗ LoanFactory read failed: ${e.message}`);
  }

  // 5. CreditScore reachability (check score for zero address — safe, returns 0)
  console.log("\n=== CREDIT SCORE ===");
  try {
    const score = new ethers.Contract(ADDRESSES.CreditScore, CREDIT_ABI, provider);
    const zeroScore = await score.getScore(ethers.ZeroAddress);
    console.log(`  getScore(0x0): ${zeroScore.toString()}  [✓ reachable]`);
  } catch (e) {
    console.log(`  ✗ CreditScore read failed: ${e.message}`);
  }

  // 6. LendingPool USDC wiring + stats
  console.log("\n=== LENDING POOL ===");
  try {
    const pool = new ethers.Contract(ADDRESSES.LendingPool, POOL_ABI, provider);
    const poolName        = await pool.name();
    const poolUsdc        = await pool.usdc();
    const totalShares     = await pool.totalShares();
    const totalAssets     = await pool.totalAssets();
    const totalReceivables = await pool.totalReceivables();
    const usdcOk = poolUsdc.toLowerCase() === ADDRESSES.USDC.toLowerCase();
    console.log(`  name():           ${poolName}`);
    console.log(`  usdc():           ${poolUsdc}  [${usdcOk ? "✓ matches USDC address" : "✗ MISMATCH"}]`);
    console.log(`  totalShares():    ${totalShares.toString()}`);
    console.log(`  totalAssets():    ${ethers.formatUnits(totalAssets, 6)} USDC`);
    console.log(`  totalReceivables: ${ethers.formatUnits(totalReceivables, 6)} USDC`);
  } catch (e) {
    console.log(`  ✗ LendingPool read failed: ${e.message}`);
  }

  // 7. Frontend .env.local address alignment
  console.log("\n=== FRONTEND ENV ALIGNMENT ===");
  const envFactory  = process.env.NEXT_PUBLIC_LOAN_FACTORY_ADDRESS  || "";
  const envScore    = process.env.NEXT_PUBLIC_CREDIT_SCORE_ADDRESS   || "";
  const envPool     = process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS   || "";
  const envUsdc     = process.env.NEXT_PUBLIC_USDC_ADDRESS           || process.env.NEXT_PUBLIC_ARC_USDC_ADDRESS || "";

  const check = (label, envVal, expected) => {
    const match = envVal.toLowerCase() === expected.toLowerCase();
    console.log(`  ${label}: ${match ? "✓ match" : "✗ MISMATCH"} (env: ${envVal || "(empty)"})`);
  };
  check("LOAN_FACTORY_ADDRESS ", envFactory, ADDRESSES.LoanFactory);
  check("CREDIT_SCORE_ADDRESS ", envScore,   ADDRESSES.CreditScore);
  check("LENDING_POOL_ADDRESS ", envPool,    ADDRESSES.LendingPool);
  check("USDC_ADDRESS         ", envUsdc,    ADDRESSES.USDC);

  console.log("\n=== VERIFICATION COMPLETE ===\n");
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
