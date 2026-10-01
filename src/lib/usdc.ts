import { formatUnits, parseUnits } from "ethers";
import { USDC_DECIMALS } from "@/lib/contracts/config";

export function parseUsdc(amount: string): bigint {
  return parseUnits(amount, USDC_DECIMALS);
}

export function formatUsdc(amount: bigint | string): string {
  return formatUnits(amount, USDC_DECIMALS);
}