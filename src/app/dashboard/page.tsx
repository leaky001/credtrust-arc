"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@/contexts/WalletContext";
import { useLoans } from "@/hooks/useLoans";
import { formatUsdc } from "@/lib/usdc";
import type { Loan } from "@/types/loan";
import {
  Activity,
  Coins,
  History as HistoryIcon,
  Landmark,
  LayoutDashboard,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { motion } from "framer-motion";

const containerVariants = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.08 } } };
const itemVariants = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

function formatUsdcDisplay(amount: string) {
  const [whole, fraction = ""] = formatUsdc(amount).split(".");
  return `${whole}.${fraction.replace(/0+$/, "").padEnd(2, "0")}`;
}

function formatActivityDate(timestamp?: number) {
  if (!timestamp) return null;
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const { address, isConnected, openPicker } = useWallet();
  const { fetchCreditScore, fetchLoans, fetchPoolStats, fetchUsdcBalance, isConfigured, error } = useLoans();
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [suppliedBalance, setSuppliedBalance] = useState<string | null>(null);
  const [creditScore, setCreditScore] = useState<number | null>(null);
  const [userLoans, setUserLoans] = useState<Loan[]>([]);
  const [readErrors, setReadErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    if (!isConnected || !address) {
      setWalletBalance(null);
      setSuppliedBalance(null);
      setCreditScore(null);
      setUserLoans([]);
      setReadErrors([]);
      setLoading(false);
      return () => { mounted = false; };
    }

    setLoading(true);
    setWalletBalance(null);
    setSuppliedBalance(null);
    setCreditScore(null);
    setUserLoans([]);
    setReadErrors([]);

    const loadAccount = async () => {
      const [balanceResult, poolResult, scoreResult, loansResult] = await Promise.allSettled([
        fetchUsdcBalance(address, true),
        fetchPoolStats(address),
        fetchCreditScore(address, true),
        fetchLoans(true),
      ]);

      if (!mounted) return;
      const errors: string[] = [];

      if (balanceResult.status === "fulfilled") setWalletBalance(balanceResult.value);
      else errors.push("Wallet balance could not be read.");

      if (poolResult.status === "fulfilled" && poolResult.value) {
        setSuppliedBalance(poolResult.value.userBalance);
      } else {
        errors.push("Supplied balance could not be read.");
      }

      if (scoreResult.status === "fulfilled") setCreditScore(scoreResult.value);
      else errors.push("Credit score could not be read.");

      if (loansResult.status === "fulfilled") {
        const lowerAddress = address.toLowerCase();
        setUserLoans(loansResult.value.filter((loan) =>
          loan.borrower.toLowerCase() === lowerAddress ||
          loan.lenders?.some((lender) => lender.toLowerCase() === lowerAddress) ||
          loan.lender?.toLowerCase() === lowerAddress
        ));
      } else {
        errors.push("Loan activity could not be read.");
      }

      if (!isConfigured) errors.push("Loan and credit contracts are not configured.");
      setReadErrors(errors);
      setLoading(false);
    };

    void loadAccount();
    return () => { mounted = false; };
  }, [address, fetchCreditScore, fetchLoans, fetchPoolStats, fetchUsdcBalance, isConnected, isConfigured, refreshKey]);

  const activeLoans = userLoans.filter((loan) => loan.status === "Active" || loan.status === "Funded");
  const loanReadFailed = !isConfigured || readErrors.includes("Loan activity could not be read.");
  const recentLoans = userLoans.slice().reverse().slice(0, 5);

  return (
    <div className="relative isolate min-h-screen bg-transparent pb-24">
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] size-[40%] rounded-full bg-primary-500/10 blur-[120px]" />
        <div className="absolute top-[20%] -right-[5%] size-[30%] rounded-full bg-accent-500/5 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-container-xl px-4 py-12 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="flex flex-col gap-8"
        >
          <motion.div variants={itemVariants} className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-500">
                <LayoutDashboard className="size-3.5" />
                Account Overview
              </div>
              <h1 className="text-h2 font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
              <p className="text-small text-slate-600 dark:text-slate-400">
                {address ? `Connected account ${address.slice(0, 6)}...${address.slice(-4)}` : "Your live lending and credit account."}
              </p>
            </div>
            {isConnected ? (
              <Button variant="secondary" size="sm" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading}>
                <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={openPicker}>Connect Wallet</Button>
            )}
          </motion.div>

          {!isConnected && (
            <motion.div variants={itemVariants} className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center dark:border-slate-700 dark:bg-slate-900/30">
              <Wallet className="mx-auto mb-3 size-8 text-primary-500" />
              <h2 className="text-h4 font-bold text-slate-900 dark:text-white">Connect Wallet</h2>
              <p className="mt-2 text-small text-slate-500 dark:text-slate-400">Connect your selected wallet to view live account data.</p>
            </motion.div>
          )}

          {readErrors.length > 0 && isConnected && (
            <motion.div variants={itemVariants} role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-small text-amber-800 dark:text-amber-300">
              Some account data could not be loaded. {readErrors.join(" ")}
              {error && ` ${error}`}
            </motion.div>
          )}

          <motion.section variants={itemVariants} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "Wallet Balance", icon: Wallet, value: walletBalance === null ? null : formatUsdcDisplay(walletBalance), suffix: "USDC" },
              { label: "Supplied", icon: Landmark, value: suppliedBalance === null ? null : formatUsdcDisplay(suppliedBalance), suffix: "USDC" },
              { label: "Active Loans", icon: Activity, value: loanReadFailed ? null : activeLoans.length.toString(), suffix: "" },
              { label: "Credit Score", icon: ShieldCheck, value: creditScore?.toString() ?? null, suffix: "" },
              { label: "Earnings / Interest", icon: Coins, value: "No earnings yet", suffix: "" },
            ].map(({ label, icon: Icon, value, suffix }) => (
              <Card key={label} variant="elevated" className="glass-card min-w-0">
                <CardContent className="flex min-h-36 flex-col justify-between p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
                    <Icon className="size-4 shrink-0 text-primary-500" />
                  </div>
                  <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className={`font-bold text-slate-900 dark:text-white ${label === "Earnings / Interest" ? "text-small" : "text-h3"}`}>
                      {!isConnected ? "—" : loading ? "Loading..." : value ?? "Unavailable"}
                    </span>
                    {suffix && <span className="text-xs font-medium text-slate-500">{suffix}</span>}
                  </div>
                  {label === "Earnings / Interest" && <p className="mt-2 text-xs text-slate-500">No separate user-level earnings total is exposed.</p>}
                </CardContent>
              </Card>
            ))}
          </motion.section>

          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-white/10">
              <HistoryIcon className="size-5 text-primary-500" />
              <h2 className="text-h4 font-bold text-slate-900 dark:text-white">Recent Activity</h2>
            </div>
            {!isConnected ? (
              <p className="py-8 text-center text-small text-slate-500">Connect your wallet to view account activity.</p>
            ) : loading ? (
              <div className="animate-pulse space-y-3 py-2" aria-label="Loading recent activity">
                <div className="h-14 rounded-lg bg-slate-200/70 dark:bg-slate-800" />
                <div className="h-14 rounded-lg bg-slate-200/70 dark:bg-slate-800" />
              </div>
            ) : recentLoans.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentLoans.map((loan) => (
                  <div key={loan.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400">
                        <Activity className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white">Loan {loan.status.toLowerCase()}</p>
                        <p className="text-xs text-slate-500">{loan.borrower.toLowerCase() === address?.toLowerCase() ? "Borrower" : "Lender"} · {formatUsdcDisplay(loan.principal)} USDC</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">
                      {loan.status === "Active" || loan.status === "Funded"
                        ? formatActivityDate(loan.fundedAt) ?? loan.status
                        : loan.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : loanReadFailed ? (
              <p className="py-8 text-center text-small text-amber-700 dark:text-amber-300">Recent activity is temporarily unavailable.</p>
            ) : (
              <p className="py-8 text-center text-small text-slate-500">No recent activity</p>
            )}
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
}
