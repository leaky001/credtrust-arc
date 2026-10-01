#!/usr/bin/env node
// Simple balance checker for onboarding
// Usage (PowerShell):
// $env:ARC_RPC_URL = "https://rpc.mainnet.arc.io"; node .\scripts\checkBalance.js 0xYourAddress

const { ethers } = require('ethers');

async function main() {
  const rpc = process.env.ARC_RPC_URL || 'https://rpc.mainnet.arc.io';
  const provider = new ethers.JsonRpcProvider(rpc);
  const addr = process.argv[2] || process.env.ADDRESS;
  if (!addr) {
    console.error('Usage: node scripts/checkBalance.js <address>\nOr set ADDRESS env var.');
    process.exit(1);
  }

  try {
    const usdcAddress = process.env.ARC_USDC_ADDRESS || process.env.NEXT_PUBLIC_ARC_USDC_ADDRESS || '0x3600000000000000000000000000000000000000';
    const usdc = new ethers.Contract(usdcAddress, ["function balanceOf(address) view returns (uint256)"], provider);
    const balance = await usdc.balanceOf(addr);
    console.log('Address:', addr);
    console.log('USDC balance:', ethers.formatUnits(balance, 6));
  } catch (err) {
    console.error('Error fetching balance:', err.message || err);
    process.exit(1);
  }
}

main();
