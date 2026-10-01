#!/usr/bin/env node
const { JsonRpcProvider } = require("ethers");

async function main() {
  const rpcUrl = process.argv[2] || process.env.ARC_RPC_URL || "https://rpc.mainnet.arc.io";
  const provider = new JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log(`RPC: ${rpcUrl}`);
  console.log(`eth_chainId: ${chainId} (expected 5042)`);
  if (chainId !== 5042) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Failed to query Arc RPC:", error.message || error);
  process.exitCode = 1;
});
