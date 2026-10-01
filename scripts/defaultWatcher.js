#!/usr/bin/env node
/**
 * Default watcher skeleton:
 * - Reads factory address from NEXT_PUBLIC_LOAN_FACTORY_ADDRESS or env
 * - Lists loans, checks repaymentDeadline and status
 * - If past deadline and not defaulted/repaid, attempts to call markDefaulted()
 *
 * Usage (run locally):
 * $env:PRIVATE_KEY = '0xYOUR_KEY'; node scripts/defaultWatcher.js
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require('dotenv').config();

const LOAN_FACTORY_ABI = require("../src/lib/contracts/LoanFactory.json").abi;
const LOAN_ABI = require("../src/lib/contracts/Loan.json").abi;

async function main() {
  const RPC = process.env.ARC_RPC_URL || "https://rpc.mainnet.arc.io";
  const factoryAddr = process.env.NEXT_PUBLIC_LOAN_FACTORY_ADDRESS;
  const pk = process.env.PRIVATE_KEY;

  if (!factoryAddr) {
    console.error("Set NEXT_PUBLIC_LOAN_FACTORY_ADDRESS in your environment (or .env)");
    process.exit(1);
  }

  if (!pk) {
    console.error("Set PRIVATE_KEY in current shell to perform default marking (or use a read-only dry run)");
  }

  const provider = new ethers.JsonRpcProvider(RPC);
  const signer = pk ? new ethers.Wallet(pk, provider) : null;

  const factory = new ethers.Contract(factoryAddr, LOAN_FACTORY_ABI, provider);
  console.log("Using RPC:", RPC);
  console.log("LoanFactory:", factoryAddr);

  const loans = await factory.listLoans();
  console.log(`Found ${loans.length} loan(s)`);

  const now = Math.floor(Date.now() / 1000);
  for (const l of loans) {
    try {
      const loan = new ethers.Contract(l, LOAN_ABI, provider);
      const status = Number(await loan.status());
      const repaymentDeadline = Number(await loan.repaymentDeadline());
      console.log(`Loan ${l} status=${status} deadline=${repaymentDeadline}`);

      // Status: 3 = Repaid, 4 = Defaulted (based on contracts)
      if (repaymentDeadline > 0 && now > repaymentDeadline && status !== 3 && status !== 4) {
        console.log(`Loan ${l} appears overdue (now ${now} > ${repaymentDeadline}).`);
        if (!signer) {
          console.log("Dry-run: would call markDefaulted() here. Set PRIVATE_KEY to perform action.");
          continue;
        }

        const loanWithSigner = loan.connect(signer);
        console.log(`Calling markDefaulted() on ${l} with signer ${signer.address}`);
        const tx = await loanWithSigner.markDefaulted();
        console.log("Tx sent:", tx.hash);
        await tx.wait();
        console.log(`Marked ${l} as defaulted`);
      }
    } catch (err) {
      console.error(`Error checking loan ${l}:`, err.message || err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
