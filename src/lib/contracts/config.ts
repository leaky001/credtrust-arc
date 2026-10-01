export const ARC_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID || 5042);
export const ARC_RPC_URL = process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.mainnet.arc.io";
export const ARC_EXPLORER_URL = "https://explorer.arc.io";
export const USDC_DECIMALS = 6;
export const USDC_ADDRESS = process.env.NEXT_PUBLIC_ARC_USDC_ADDRESS ||
  process.env.NEXT_PUBLIC_USDC_ADDRESS ||
  "0x3600000000000000000000000000000000000000";

export const CONTRACT_ADDRESSES = {
  creditScore: process.env.NEXT_PUBLIC_CREDIT_SCORE_ADDRESS || "",
  loanFactory: process.env.NEXT_PUBLIC_LOAN_FACTORY_ADDRESS || "",
  lendingPool: process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS || "",
} as const;

export const SUPPORTED_CHAIN_ID = ARC_CHAIN_ID.toString();
export const RPC_URL = ARC_RPC_URL;

export const isContractConfigured = (): boolean =>
  Boolean(CONTRACT_ADDRESSES.creditScore && CONTRACT_ADDRESSES.loanFactory);
