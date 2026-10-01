#!/usr/bin/env node
// Safe transfer helper: move all funds from a compromised key to a destination address.
// USAGE (run locally; do NOT commit keys):
// $env:PRIVATE_KEY = "0xCOMPROMISED_KEY"; $env:DESTINATION_ADDRESS = "0xNEW_ADDR"; node scripts/transferFunds.js
// OR provide NEW_PRIVATE_KEY to derive destination address: $env:NEW_PRIVATE_KEY = "0xNEW_KEY"

const { ethers } = require("ethers");

async function main() {
  const RPC = process.env.ARC_RPC_URL || "https://rpc.mainnet.arc.io";
  const compromisedKey = process.env.PRIVATE_KEY;
  const newPk = process.env.NEW_PRIVATE_KEY;
  const destAddr = process.env.DESTINATION_ADDRESS || (newPk ? (new ethers.Wallet(newPk)).address : undefined);

  if (!compromisedKey) {
    console.error("Error: set PRIVATE_KEY in your environment (compromised key). Exiting.");
    process.exit(1);
  }
  if (!destAddr) {
    console.error("Error: set DESTINATION_ADDRESS or NEW_PRIVATE_KEY in your environment. Exiting.");
    process.exit(1);
  }

  console.log("Using RPC:", RPC);
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(compromisedKey, provider);
  const from = await wallet.getAddress();
  console.log("Source address:", from);
  console.log("Destination address:", destAddr);

  const balance = await provider.getBalance(from);
  console.log("Balance (wei):", balance.toString());

  // Estimate gas: basic transfer uses 21000 gas. Use fee data from provider.
  const gasLimit = 21000n;
  const feeData = await provider.getFeeData();
  // feeData.maxFeePerGas and maxPriorityFeePerGas can be undefined on some providers; fallback to gasPrice
  const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice;

  if (!gasPrice) {
    console.error("Unable to determine gas price from provider. Set ARC_RPC_URL to a reachable Arc RPC.");
    process.exit(1);
  }

  // gasPrice is a BigNumber or BigInt (ethers v6 returns BigInt). Ensure BigInt.
  const gasPriceBn = BigInt(gasPrice.toString());
  const gasCost = gasLimit * gasPriceBn;

  if (balance <= gasCost) {
    console.error("Insufficient funds to cover gas for transfer.");
    process.exit(1);
  }

  const amountToSend = balance - gasCost;
  console.log("Estimated gas cost (wei):", gasCost.toString());
  console.log("Amount to send (wei):", amountToSend.toString());

  // Build and send transaction
  const tx = await wallet.sendTransaction({
    to: destAddr,
    value: amountToSend,
    gasLimit: Number(gasLimit),
    // Note: we let ethers populate gas fees using feeData from the provider
  });

  console.log("Transaction sent. Hash:", tx.hash);
  console.log("Waiting for confirmation...");
  const receipt = await tx.wait();
  console.log("Confirmed in block", receipt.blockNumber);
  console.log("Transfer complete. Verify destination balance and revoke the old key.");
}

main().catch((err) => {
  console.error("Error in transfer:", err);
  process.exit(1);
});
