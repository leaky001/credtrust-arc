require("dotenv").config({ path: ["../.env.local", "../.env"] });
require("@nomicfoundation/hardhat-toolbox");
const path = require("path");

module.exports = {
  solidity: "0.8.24",
  paths: {
    root: path.resolve(__dirname, ".."),
    sources: "contracts",
    tests: "test",
    cache: path.resolve(__dirname, "cache"),
    artifacts: path.resolve(__dirname, "artifacts"),
  },
  networks: {
    arc_mainnet: {
      url: process.env.ARC_RPC_URL || "https://rpc.mainnet.arc.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: Number(process.env.ARC_CHAIN_ID || 5042),
    },
  },
};
