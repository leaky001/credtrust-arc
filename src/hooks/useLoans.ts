"use client";

import { useCallback, useMemo, useState } from "react";
import { Contract, ethers, parseUnits, JsonRpcProvider, type TransactionRequest } from "ethers";
import type { AccountActivity, CreateLoanParams, Loan, LoanStatus } from "@/types/loan";
import type { TransactionFeedback } from "@/types/loan";
import { useWallet } from "@/contexts/WalletContext";
import {
  ARC_EXPLORER_URL,
  CONTRACT_ADDRESSES,
  isContractConfigured,
  RPC_URL,
  SUPPORTED_CHAIN_ID,
  USDC_ADDRESS,
  USDC_DECIMALS,
} from "@/lib/contracts/config";
import {
  LOAN_FACTORY_ABI,
  LOAN_ABI,
  CREDIT_SCORE_ABI,
  LENDING_POOL_ABI,
} from "@/lib/contracts/abis";

const STATUS_MAP: Record<number, LoanStatus> = {
  0: "Requested",
  1: "Funded",
  2: "Active",
  3: "Repaid",
  4: "Defaulted",
};

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

export type TransactionState = TransactionFeedback;

const LOAN_CACHE_TTL_MS = 4000;
const loanReadCache = new Map<string, { loans: Loan[]; expiresAt: number }>();
const loanReadInFlight = new Map<string, Promise<Loan[]>>();
const ACTIVITY_CACHE_TTL_MS = 15000;
const activityReadCache = new Map<string, { activities: AccountActivity[]; expiresAt: number }>();
const activityReadInFlight = new Map<string, Promise<AccountActivity[]>>();
const HISTORY_LOG_BLOCK_RANGE = 10_000;

async function queryFilterInChunks(contract: Contract, filter: any, startBlock: number, endBlock: number): Promise<any[]> {
  if (endBlock < startBlock) return [];

  const logs: any[] = [];
  for (let fromBlock = startBlock; fromBlock <= endBlock;) {
    const toBlock = Math.min(fromBlock + HISTORY_LOG_BLOCK_RANGE - 1, endBlock);
    logs.push(...await contract.queryFilter(filter, fromBlock, toBlock));
    fromBlock = toBlock + 1;
  }

  const uniqueLogs = new Map<string, any>();
  for (const log of logs) {
    uniqueLogs.set(`${log.transactionHash}:${log.index}`, log);
  }
  return Array.from(uniqueLogs.values()).sort((left, right) =>
    left.blockNumber - right.blockNumber || left.index - right.index
  );
}

async function fetchLogsInChunks(provider: { getLogs: (filter: any) => Promise<any[]> }, filter: any, startBlock: number, endBlock: number): Promise<any[]> {
  if (endBlock < startBlock) return [];

  const logs: any[] = [];
  for (let fromBlock = startBlock; fromBlock <= endBlock;) {
    const toBlock = Math.min(fromBlock + HISTORY_LOG_BLOCK_RANGE - 1, endBlock);
    logs.push(...await provider.getLogs({ ...filter, fromBlock, toBlock }));
    fromBlock = toBlock + 1;
  }

  const uniqueLogs = new Map<string, any>();
  for (const log of logs) {
    uniqueLogs.set(`${log.transactionHash}:${log.index}`, log);
  }
  return Array.from(uniqueLogs.values()).sort((left, right) =>
    left.blockNumber - right.blockNumber || left.index - right.index
  );
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, map: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await map(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

function invalidateLoanReadCache() {
  loanReadCache.clear();
  loanReadInFlight.clear();
  activityReadCache.clear();
  activityReadInFlight.clear();
}

function isRpcRateLimitError(err: unknown): boolean {
  const error = err as {
    message?: string;
    shortMessage?: string;
    code?: string | number;
    status?: number;
    error?: { message?: string; code?: string | number; status?: number };
    info?: { error?: { message?: string; code?: string | number; status?: number } };
  };
  const details = [
    error?.message,
    error?.shortMessage,
    error?.code,
    error?.status,
    error?.error?.message,
    error?.error?.code,
    error?.error?.status,
    error?.info?.error?.message,
    error?.info?.error?.code,
    error?.info?.error?.status,
  ].filter((value) => value !== undefined && value !== null).join(" ");
  return /\b429\b|too many requests|rate.?limit|resource exhausted/i.test(details);
}

export function useLoans() {
  const { signer, isConnected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [transaction, setTransaction] = useState<TransactionState>({ status: "idle" });

  const explainTransactionError = (err: unknown): string => {
    const error = err as { code?: string | number; shortMessage?: string; message?: string };
    const message = error.shortMessage || error.message || String(err);
    if (error.code === 4001 || error.code === "ACTION_REJECTED") return "Wallet transaction was rejected.";
    if (error.code === "INSUFFICIENT_FUNDS" || /insufficient funds/i.test(message)) {
      return "Insufficient USDC for Arc gas fees. Add USDC to this wallet for gas and lending.";
    }
    if (/allowance/i.test(message)) return "Insufficient USDC allowance. Approve USDC and retry.";
    if (/transfer amount exceeds balance|insufficient usdc/i.test(message)) return "Insufficient USDC balance.";
    if (/CALL_EXCEPTION|revert/i.test(message)) return `Transaction failed: ${message}`;
    return message;
  };

  const assertArcNetwork = useCallback(async () => {
    if (!signer?.provider) throw new Error("Connect an EVM wallet to Arc Mainnet.");
    const network = await signer.provider.getNetwork();
    if (network.chainId.toString() !== SUPPORTED_CHAIN_ID) {
      throw new Error(`Wrong network. Switch your wallet to Arc Mainnet (chain ID ${SUPPORTED_CHAIN_ID}).`);
    }
  }, [signer]);

  const sendAndWait = useCallback(async (action: string, request: TransactionRequest) => {
    if (!signer) throw new Error("Wallet not connected");
    setTransaction({ status: "pending", message: `Confirm ${action} in your wallet.` });
    try {
      const tx = await signer.sendTransaction(request);
      const explorerUrl = `${ARC_EXPLORER_URL}/tx/${tx.hash}`;
      setTransaction({ status: "pending", message: `${action} is pending on Arc.`, hash: tx.hash, explorerUrl });
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw new Error("Transaction failed on Arc.");
      invalidateLoanReadCache();
      setTransaction({ status: "success", message: `${action} confirmed.`, hash: tx.hash, explorerUrl });
      return receipt;
    } catch (err) {
      const message = explainTransactionError(err);
      setTransaction({ status: "failed", message });
      throw new Error(message);
    }
  }, [signer]);

  const ensureUsdcAllowance = useCallback(async (spender: string, amount: bigint) => {
    if (!signer) throw new Error("Wallet not connected");
    const owner = await signer.getAddress();
    const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const [balance, allowance] = await Promise.all([
      usdc.balanceOf(owner) as Promise<bigint>,
      usdc.allowance(owner, spender) as Promise<bigint>,
    ]);
    if (balance < amount) throw new Error("Insufficient USDC balance.");
    if (allowance < amount) {
      const approval = await usdc.approve.populateTransaction(spender, amount);
      await sendAndWait("USDC approval", approval);
      const updatedAllowance = await usdc.allowance(owner, spender) as bigint;
      if (updatedAllowance < amount) throw new Error("Insufficient USDC allowance after approval.");
    }
  }, [sendAndWait, signer]);

  // Read-only RPC provider (used for fetching listings reliably)
  const rpcProvider = useMemo(() => {
    if (typeof window === "undefined" || !isContractConfigured()) return null;
    try {
      return new JsonRpcProvider(RPC_URL);
    } catch {
      return null;
    }
  }, []);

  // Signer-backed provider (injected wallet) used for write actions
  const signerProvider = useMemo(() => {
    if (typeof window === "undefined") return null;
    return signer?.provider ?? null;
  }, [signer]);

  // (NO `provider` variable here) We'll compute an `activeProvider` inside
  // each callback so dependencies are explicit (rpcProvider, signerProvider, signer).

  const createLoan = useCallback(
    async (params: CreateLoanParams) => {
      if (!signer || !isConnected) {
        throw new Error("Wallet not connected");
      }

      if (!isContractConfigured()) {
        throw new Error(
          "Contracts not configured. Deploy with: npm run deploy:local"
        );
      }

      setLoading(true);
      setError(null);

      try {
        await assertArcNetwork();
        const factory = new Contract(
          CONTRACT_ADDRESSES.loanFactory,
          LOAN_FACTORY_ABI,
          signer
        );

        const request = await factory.createLoan.populateTransaction(
          parseUnits(params.amount, USDC_DECIMALS),
          params.duration,
        ) as TransactionRequest;
        await sendAndWait("Loan request", request);
        return { success: true } as const;
      } catch (err) {
        const message = explainTransactionError(err);
        setError(message);
        setTransaction((current) => current.status === "failed" ? current : { status: "failed", message });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [assertArcNetwork, sendAndWait, signer, isConnected]
  );

  const fundLoan = useCallback(
    async (loanAddress: string, amountWei: bigint) => {
      if (!signer || !isContractConfigured()) {
        throw new Error("Not ready: signer or contracts not configured");
      }
      setActionLoading(true);
      try {
        await assertArcNetwork();
        await ensureUsdcAllowance(loanAddress, amountWei);
        const loanContract = new Contract(loanAddress, LOAN_ABI, signer);
        const request = await loanContract.fund.populateTransaction(amountWei) as TransactionRequest;
        await sendAndWait("Loan funding", request);
        return { success: true } as const;
      } catch (err) {
        const message = explainTransactionError(err);
        setError(message);
        setTransaction((current) => current.status === "failed" ? current : { status: "failed", message });
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [assertArcNetwork, ensureUsdcAllowance, sendAndWait, signer]
  );

  const repayLoan = useCallback(
    async (loanAddress: string) => {
      if (!signer || !isContractConfigured()) {
        throw new Error("Not ready: signer or contracts not configured");
      }
      setActionLoading(true);
      try {
        await assertArcNetwork();
        const loanContract = new Contract(loanAddress, LOAN_ABI, signer);
        const total = await loanContract.getTotalRepayment() as bigint;
        await ensureUsdcAllowance(loanAddress, total);
        const request = await loanContract.repay.populateTransaction() as TransactionRequest;
        await sendAndWait("USDC repayment", request);
        return { success: true } as const;
      } catch (err) {
        const message = explainTransactionError(err);
        setError(message);
        setTransaction((current) => current.status === "failed" ? current : { status: "failed", message });
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [assertArcNetwork, ensureUsdcAllowance, sendAndWait, signer]
  );

  const markDefaulted = useCallback(
    async (loanAddress: string) => {
      if (!signer || !isContractConfigured()) {
        throw new Error("Not ready: signer or contracts not configured");
      }
      setActionLoading(true);
      try {
        await assertArcNetwork();
        const loanContract = new Contract(loanAddress, LOAN_ABI, signer);
        const request = await loanContract.markDefaulted.populateTransaction() as TransactionRequest;
        await sendAndWait("Default update", request);
        return { success: true } as const;
      } catch (err) {
        const message = explainTransactionError(err);
        setError(message);
        setTransaction((current) => current.status === "failed" ? current : { status: "failed", message });
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [assertArcNetwork, sendAndWait, signer]
  );

  const fetchLoans = useCallback(async (failOnError = false): Promise<Loan[]> => {
    if (!isContractConfigured()) {
      if (failOnError) throw new Error("Loan contracts are not configured.");
      return [];
    }
    if (failOnError) setError(null);

    try {
  // Prefer the read-only RPC provider for listing to avoid wallet-injected
  // providers returning Internal JSON-RPC errors. Fall back to signer
  // provider only if RPC provider is not configured.
  const activeProvider = rpcProvider || signerProvider || signer?.provider;
      if (!activeProvider) {
        if (failOnError) throw new Error("No provider is available to read loan records.");
        return [];
      }

      // Check the wallet network separately from the fixed Arc read provider.
      try {
        const network = await (signerProvider || activeProvider).getNetwork();
        const currentChainId = network.chainId.toString();
        const expectedChainId = SUPPORTED_CHAIN_ID;

        if (isConnected && currentChainId !== expectedChainId && expectedChainId !== "0") {
          const networkError = `WRONG_NETWORK:${expectedChainId}`;
          setError(networkError);
          if (failOnError) throw new Error(networkError);
          return [];
        }
      } catch (netErr) {
        console.warn("Could not verify network:", netErr);
      }

      const cacheKey = `${RPC_URL}:${SUPPORTED_CHAIN_ID}:${CONTRACT_ADDRESSES.loanFactory.toLowerCase()}`;
      const cached = loanReadCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) return cached.loans;
      if (cached) loanReadCache.delete(cacheKey);
      const inFlight = loanReadInFlight.get(cacheKey);
      if (inFlight) return await inFlight;

      const readPromise = (async () => {
        const factory = new Contract(
          CONTRACT_ADDRESSES.loanFactory,
          LOAN_FACTORY_ABI,
          activeProvider
        );
        const addrs = await factory.listLoans();
        const loans: Loan[] = [];

        for (let i = 0; i < addrs.length; i++) {
          const loanContract = new Contract(addrs[i], LOAN_ABI, activeProvider);
          const [
            borrower,
            principal,
            interestRateBps,
            durationDays,
            status,
            fundedAt,
            repaymentDeadline,
            totalFunded,
            lendersCount,
          ] = await Promise.all([
            loanContract.borrower(),
            loanContract.principal(),
            loanContract.interestRateBps(),
            loanContract.durationDays(),
            loanContract.status(),
            loanContract.fundedAt(),
            loanContract.repaymentDeadline(),
            loanContract.totalFunded(),
            loanContract.getLendersCount(),
          ]);

          const lenderAddresses = Number(lendersCount) > 0
            ? await Promise.all(Array.from(
              { length: Number(lendersCount) },
              (_, index) => loanContract.lenders(index) as Promise<string>
            ))
            : [];

          const remBn = (principal as bigint) - (totalFunded as bigint);
          loans.push({
            id: addrs[i],
            borrower,
            lender: lenderAddresses[0] === ethers.ZeroAddress ? null : lenderAddresses[0] ?? null,
            lenders: lenderAddresses.filter((lender) => lender !== ethers.ZeroAddress),
            lendersCount: Number(lendersCount),
            totalFunded: totalFunded.toString(),
            principal: principal.toString(),
            remaining: remBn > BigInt(0) ? remBn.toString() : "0",
            interestRate: (Number(interestRateBps) / 100).toString(),
            duration: Number(durationDays),
            status: STATUS_MAP[Number(status)] ?? "Requested",
            createdAt: 0,
            fundedAt: fundedAt > 0 ? Number(fundedAt) : undefined,
            repaymentDeadline:
              repaymentDeadline > 0 ? Number(repaymentDeadline) : undefined,
          });
        }
        return loans;
      })();
      loanReadInFlight.set(cacheKey, readPromise);
      try {
        const loans = await readPromise;
        loanReadCache.set(cacheKey, { loans, expiresAt: Date.now() + LOAN_CACHE_TTL_MS });
        return loans;
      } finally {
        if (loanReadInFlight.get(cacheKey) === readPromise) loanReadInFlight.delete(cacheKey);
      }
      } catch (err) {
      console.error("fetchLoans error:", err);
      const message = err instanceof Error ? err.message : String(err);
      // Handle known failure modes with actionable messages
      let userFacingMessage = message;
      if (isRpcRateLimitError(err)) {
        userFacingMessage = "Arc RPC is temporarily rate-limiting requests. Please wait a moment and retry.";
      } else if (message.includes("could not decode result data") || message.includes("0x")) {
        userFacingMessage = `Contract Interaction Failed: The app found address ${CONTRACT_ADDRESSES.loanFactory} but it has no code on your current wallet's network. (Expected Chain: ${SUPPORTED_CHAIN_ID})`;
      } else if (message.includes("ECONNREFUSED")) {
        userFacingMessage = `Blockchain connection failed. Ensure the testnet RPC (${RPC_URL}) is reachable and that your node (e.g. Hardhat) is running.`;
      } else if (message.includes('Internal JSON-RPC error') || message.includes('-32603')) {
        userFacingMessage = 'Internal JSON-RPC error from your wallet or node. Check that your wallet is connected to Arc Mainnet and the RPC is reachable.';
      }
      setError(userFacingMessage);
      if (failOnError) throw new Error(userFacingMessage);
      return [];
    }
  }, [signer, rpcProvider, signerProvider, isConnected]);

  const fetchLoanDetails = useCallback(
    async (loanAddress: string): Promise<Loan & { totalRepayment: string }> => {
      const activeProvider = rpcProvider || signerProvider || signer?.provider;
      if (!activeProvider || !isContractConfigured()) {
        throw new Error("Provider or contracts not configured");
      }

      const loanContract = new Contract(loanAddress, LOAN_ABI, activeProvider);
      const [
        borrower,
        principal,
        interestRateBps,
        durationDays,
        status,
        fundedAt,
        repaymentDeadline,
        totalRepayment,
        totalFunded,
        lendersCount,
      ] = await Promise.all([
        loanContract.borrower(),
        loanContract.principal(),
        loanContract.interestRateBps(),
        loanContract.durationDays(),
        loanContract.status(),
        loanContract.fundedAt(),
        loanContract.repaymentDeadline(),
        loanContract.getTotalRepayment(),
        loanContract.totalFunded(),
        loanContract.getLendersCount(),
      ]);

      let lenderAddr: string | null = null;
      if (Number(lendersCount) > 0) {
        lenderAddr = await loanContract.lenders(0);
      }

      let remaining = "0";
      const remBn = (principal as bigint) - (totalFunded as bigint);
      remaining = remBn > BigInt(0) ? remBn.toString() : "0";

      return {
        id: loanAddress,
        borrower,
        lender: lenderAddr === ethers.ZeroAddress ? null : lenderAddr,
        lendersCount: Number(lendersCount),
        totalFunded: totalFunded.toString(),
        principal: principal.toString(),
        totalRepayment: totalRepayment.toString(),
        remaining,
        interestRate: (Number(interestRateBps) / 100).toString(),
        duration: Number(durationDays),
        status: STATUS_MAP[Number(status)] ?? "Requested",
        createdAt: 0,
        fundedAt: fundedAt > 0 ? Number(fundedAt) : undefined,
        repaymentDeadline:
          repaymentDeadline > 0 ? Number(repaymentDeadline) : undefined,
      };
    },
  [signer, rpcProvider, signerProvider]
  );

  const fetchCreditScore = useCallback(
    async (userAddress: string, failOnError = false): Promise<number> => {
      if (!isContractConfigured()) {
        if (failOnError) throw new Error("Credit score contract is not configured.");
        return 0;
      }

      const activeProvider = rpcProvider || signerProvider || signer?.provider;
      if (!activeProvider) {
        if (failOnError) throw new Error("No provider is available to read the credit score.");
        return 0;
      }

      try {
        const creditScore = new Contract(
          CONTRACT_ADDRESSES.creditScore,
          CREDIT_SCORE_ABI,
          activeProvider
        );
        const score = await creditScore.getScore(userAddress);
        return Number(score);
      } catch (err) {
        console.error("fetchCreditScore error:", err);
        if (failOnError) throw err;
        return 0;
      }
    },
  [signer, rpcProvider, signerProvider]
  );

  const fetchUsdcBalance = useCallback(async (userAddress: string, failOnError = false): Promise<string> => {
    const activeProvider = rpcProvider || signerProvider || signer?.provider;
    if (!activeProvider) {
      if (failOnError) throw new Error("No provider is available to read the USDC balance.");
      return "0";
    }
    const token = new Contract(USDC_ADDRESS, ERC20_ABI, activeProvider);
    const balance = await token.balanceOf(userAddress) as bigint;
    return balance.toString();
  }, [rpcProvider, signerProvider, signer]);

  const fetchAccountActivity = useCallback(async (userAddress: string): Promise<AccountActivity[]> => {
    if (!isContractConfigured()) throw new Error("Loan contracts are not configured.");
    const activeProvider = rpcProvider || signerProvider || signer?.provider;
    if (!activeProvider) throw new Error("No provider is available to read account activity.");

    const cacheKey = `${RPC_URL}:${SUPPORTED_CHAIN_ID}:${CONTRACT_ADDRESSES.loanFactory.toLowerCase()}:${userAddress.toLowerCase()}`;
    const cached = activityReadCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.activities;
    if (cached) activityReadCache.delete(cacheKey);
    const inFlight = activityReadInFlight.get(cacheKey);
    if (inFlight) return inFlight;

    const activityPromise = (async () => {
      const factory = new Contract(CONTRACT_ADDRESSES.loanFactory, LOAN_FACTORY_ABI, activeProvider);
      const loanAddresses = await factory.listLoans() as string[];
      const poolAddress = CONTRACT_ADDRESSES.lendingPool || await factory.getLendingPool() as string;
      if (!poolAddress) throw new Error("Lending pool is not available.");
      const latestBlock = await activeProvider.getBlockNumber();

      const eventLogs: Array<{ kind: AccountActivity["kind"]; log: any; loanAddress?: string; amount?: string; interest?: string }> = [];
      const loanCreatedLogs = await queryFilterInChunks(factory, factory.filters.LoanCreated(null, userAddress), 0, latestBlock);
      for (const log of loanCreatedLogs) {
        eventLogs.push({
          kind: "Loan created",
          log,
          loanAddress: loanAddresses[Number(log.args.loanId)],
          amount: log.args.principal.toString(),
        });
      }

      const pool = new Contract(poolAddress, LENDING_POOL_ABI, activeProvider);
      const depositTopic = pool.interface.getEvent("Deposited")!.topicHash;
      const withdrawalTopic = pool.interface.getEvent("Withdrawn")!.topicHash;
      const accountTopic = ethers.zeroPadValue(userAddress, 32);
      const poolLogs = await fetchLogsInChunks(activeProvider, {
        address: poolAddress,
        topics: [[depositTopic, withdrawalTopic], accountTopic],
      }, 0, latestBlock);
      for (const log of poolLogs) {
        const parsed = pool.interface.parseLog(log);
        if (parsed?.name === "Deposited") {
          eventLogs.push({ kind: "Pool deposit", log, amount: parsed.args.amount.toString() });
        } else if (parsed?.name === "Withdrawn") {
          eventLogs.push({ kind: "Pool withdrawal", log, amount: parsed.args.amount.toString() });
        }
      }

      const loanEventGroups = await mapWithConcurrency(loanAddresses, 3, async (loanAddress) => {
        const loan = new Contract(loanAddress, LOAN_ABI, activeProvider);
        const borrower = await loan.borrower() as string;
        const lendersCount = await loan.getLendersCount() as bigint;
        const lenders: string[] = [];
        for (let index = 0; index < Number(lendersCount); index++) {
          lenders.push(await loan.lenders(index) as string);
        }
        const isBorrower = borrower.toLowerCase() === userAddress.toLowerCase();
        const isLender = lenders.some((lender) => lender.toLowerCase() === userAddress.toLowerCase());
        if (!isBorrower && !isLender) return [];

        const loanLogs = await fetchLogsInChunks(activeProvider, { address: loanAddress }, 0, latestBlock);
        const activities: Array<{ kind: AccountActivity["kind"]; log: any; loanAddress: string; amount?: string; interest?: string }> = [];
        for (const log of loanLogs) {
          const parsed = loan.interface.parseLog(log);
          if (!parsed) continue;
          if (parsed.name === "LoanFunded") {
            activities.push({ kind: "Loan funded", log, loanAddress, amount: parsed.args.amount.toString() });
          } else if (parsed.name === "LoanPartiallyFunded") {
            activities.push({ kind: "Loan partially funded", log, loanAddress, amount: parsed.args.amount.toString() });
          } else if (parsed.name === "LoanRepaid") {
            activities.push({ kind: "Loan repaid", log, loanAddress, amount: parsed.args.principal.toString(), interest: parsed.args.interest.toString() });
          } else if (parsed.name === "LoanDefaulted") {
            activities.push({ kind: "Loan defaulted", log, loanAddress });
          }
        }
        return activities;
      });
      eventLogs.push(...loanEventGroups.flat());

      const blockTimestamps = new Map<number, number>();
      const eventBlockNumbers = Array.from(new Set(eventLogs.map(({ log }) => log.blockNumber)));
      await mapWithConcurrency(eventBlockNumbers, 3, async (blockNumber) => {
        const block = await activeProvider.getBlock(blockNumber);
        if (block) blockTimestamps.set(blockNumber, block.timestamp);
        return blockNumber;
      });

      return eventLogs.map(({ kind, log, loanAddress, amount, interest }) => ({
        id: `${log.transactionHash}-${log.index}`,
        kind,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        timestamp: blockTimestamps.get(log.blockNumber) ?? 0,
        loanAddress,
        amount,
        interest,
      })).sort((left, right) => right.blockNumber - left.blockNumber);
    })();

    activityReadInFlight.set(cacheKey, activityPromise);
    try {
      const activities = await activityPromise;
      activityReadCache.set(cacheKey, { activities, expiresAt: Date.now() + ACTIVITY_CACHE_TTL_MS });
      return activities;
    } finally {
      if (activityReadInFlight.get(cacheKey) === activityPromise) activityReadInFlight.delete(cacheKey);
    }
  }, [rpcProvider, signer, signerProvider]);

  const getAlgorithmicInterestRate = useCallback(
    async (userAddress: string): Promise<number> => {
      if (!isContractConfigured()) return 0;

      const activeProvider = rpcProvider || signerProvider || signer?.provider;
      if (!activeProvider) return 0;

      try {
        const creditScore = new Contract(
          CONTRACT_ADDRESSES.creditScore,
          CREDIT_SCORE_ABI,
          activeProvider
        );
        const rateBps = await creditScore.calculateInterestRate(userAddress);
        return Number(rateBps) / 100; // Returns APY %
      } catch (err) {
        console.error("getAlgorithmicInterestRate error:", err);
        return 0;
      }
    },
  [signer, rpcProvider, signerProvider]
  );

  const getPoolAddress = useCallback(async () => {
    if (CONTRACT_ADDRESSES.lendingPool) return CONTRACT_ADDRESSES.lendingPool;
    const activeProvider = rpcProvider || signerProvider || signer?.provider;
    if (!activeProvider) return null;
    const factory = new Contract(CONTRACT_ADDRESSES.loanFactory, LOAN_FACTORY_ABI, activeProvider);
    return await factory.getLendingPool();
  }, [rpcProvider, signerProvider, signer]);

  const depositToPool = useCallback(async (amount: string) => {
    if (!signer) throw new Error("Wallet not connected");
    setLoading(true);
    try {
      await assertArcNetwork();
      const amountUnits = parseUnits(amount, USDC_DECIMALS);
      const poolAddr = await getPoolAddress();
      if (!poolAddr) throw new Error("Lending pool is not configured.");
      await ensureUsdcAllowance(poolAddr, amountUnits);
      const pool = new Contract(poolAddr!, LENDING_POOL_ABI, signer);
      const request = await pool.deposit.populateTransaction(amountUnits) as TransactionRequest;
      await sendAndWait("USDC pool deposit", request);
    } catch (err) {
      const message = explainTransactionError(err);
      setError(message);
      setTransaction((current) => current.status === "failed" ? current : { status: "failed", message });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [assertArcNetwork, ensureUsdcAllowance, getPoolAddress, sendAndWait, signer]);

  const withdrawFromPool = useCallback(async (shares: string) => {
    if (!signer) throw new Error("Wallet not connected");
    setLoading(true);
    try {
      await assertArcNetwork();
      const poolAddr = await getPoolAddress();
      if (!poolAddr) throw new Error("Lending pool is not configured.");
      const pool = new Contract(poolAddr!, LENDING_POOL_ABI, signer);
      const request = await pool.withdraw.populateTransaction(shares) as TransactionRequest;
      await sendAndWait("USDC pool withdrawal", request);
    } catch (err) {
      const message = explainTransactionError(err);
      setError(message);
      setTransaction((current) => current.status === "failed" ? current : { status: "failed", message });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [assertArcNetwork, getPoolAddress, sendAndWait, signer]);

  const fetchPoolStats = useCallback(async (userAddress?: string) => {
    const activeProvider = rpcProvider || signerProvider || signer?.provider;
    if (!activeProvider) return null;
    try {
      const poolAddr = await getPoolAddress();
      const pool = new Contract(poolAddr!, LENDING_POOL_ABI, activeProvider);
      const [totalLiquidity, totalShares] = await Promise.all([
        pool.totalAssets(),
        pool.totalShares(),
      ]);

      let userBalance = "0";
      let userShares = "0";
      const accountAddress = userAddress || (signer ? await signer.getAddress() : null);
      if (accountAddress) {
        const [bal, sh] = await Promise.all([
          pool.getBalanceOf(accountAddress),
          pool.shares(accountAddress)
        ]);
        userBalance = bal.toString();
        userShares = sh.toString();
      }

      return {
        totalLiquidity: totalLiquidity.toString(),
        totalShares: totalShares.toString(),
        userBalance,
        userShares,
        poolAddress: poolAddr
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [rpcProvider, signerProvider, signer, getPoolAddress]);

  const borrowFromPool = useCallback(async (params: CreateLoanParams) => {
    if (!signer) throw new Error("Wallet not connected");
    setLoading(true);
    try {
      await assertArcNetwork();
      const factory = new Contract(CONTRACT_ADDRESSES.loanFactory, LOAN_FACTORY_ABI, signer);
      const request = await factory.borrowFromPool.populateTransaction(
        parseUnits(params.amount, USDC_DECIMALS),
        params.duration,
      ) as TransactionRequest;
      await sendAndWait("Pool-funded loan request", request);
    } catch (err) {
      const message = explainTransactionError(err);
      setError(message);
      setTransaction((current) => current.status === "failed" ? current : { status: "failed", message });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [assertArcNetwork, sendAndWait, signer]);

  return {
    createLoan,
    borrowFromPool,
    depositToPool,
    withdrawFromPool,
    fetchPoolStats,
    fetchLoans,
    fetchLoanDetails,
    fetchCreditScore,
    fetchUsdcBalance,
    fetchAccountActivity,
    getAlgorithmicInterestRate,
    fundLoan,
    repayLoan,
    markDefaulted,
    loading,
    actionLoading,
    error,
    isConfigured: isContractConfigured(),
    transaction,
  };
}
