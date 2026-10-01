"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  TrendingUp,
  Calendar,
  ShieldCheck,
  ArrowUpRight,
  AlertCircle,
  Clock,
  Landmark,
  Activity
} from "lucide-react";
import { formatUsdc, parseUsdc } from "@/lib/usdc";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useLoans } from "@/hooks/useLoans";
import { useWallet } from "@/contexts/WalletContext";
import type { Loan } from "@/types/loan";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { Toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { TransactionNotice } from "@/components/ui/TransactionNotice";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

interface LoansListProps {
  borrower?: string;
  lender?: string;
  status?: string[];
  emptyMessage?: string;
  requireWallet?: boolean;
}

export function LoansList({ borrower, lender, status, emptyMessage, requireWallet }: LoansListProps) {
  const { fetchLoans, fetchCreditScore, isConfigured, fundLoan, repayLoan, actionLoading, error, transaction } = useLoans();
  const { address, switchNetwork } = useWallet();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"fund" | "repay" | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "info" } | null>(null);
  const [fundAmount, setFundAmount] = useState<string>("");
  const [fundError, setFundError] = useState<string | null>(null);

  useEffect(() => {
    // Reset loans state immediately on borrower/lender/filter change to eliminate stale data
    setLoans([]);
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    if (requireWallet && !borrower && !lender) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let mounted = true;
    fetchLoans()
      .then((data) => {
        if (mounted) {
          let filtered = data;
          if (borrower) {
            filtered = filtered.filter(l => l.borrower.toLowerCase() === borrower.toLowerCase());
          }
          if (lender) {
            filtered = filtered.filter(l => l.lender?.toLowerCase() === lender.toLowerCase());
          }
          if (status && status.length > 0) {
            filtered = filtered.filter(l => status.includes(l.status));
          }
          setLoans(filtered);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [fetchLoans, isConfigured, borrower, lender, status, requireWallet]);

  useEffect(() => {
    if (!isConfigured || loans.length === 0) return;
    const loadScores = async () => {
      const map: Record<string, number> = {};
      for (const loan of loans) {
        const score = await fetchCreditScore(loan.borrower);
        map[loan.borrower] = score;
      }
      setScores(map);
    };
    loadScores();
  }, [fetchCreditScore, isConfigured, loans]);

  if (!isConfigured) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 p-12 text-center glass"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
          <Landmark className="size-6" />
        </div>
        <p className="text-body font-medium text-slate-600 dark:text-slate-400">
          Blockchain configuration required to browse marketplace.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <code className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-mono text-primary-400 border border-primary-500/20">
            npm run deploy:local
          </code>
        </div>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center space-y-6">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-t-2 border-primary-500 animate-spin" />
          <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-primary-500/10" />
        </div>
        <div className="text-center">
          <p className="text-h4 font-bold text-slate-900 dark:text-white animate-pulse">Syncing Lattice...</p>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Verifying reputation chains</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isWrongNetwork = error.startsWith("WRONG_NETWORK:");
    const expectedChainId = isWrongNetwork ? error.split(":")[1] : null;
    const isLocal = expectedChainId === "31337";

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl border border-red-500/20 bg-red-500/5 p-10 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <AlertCircle className="size-32 text-red-500" />
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 glow-red">
            <AlertCircle className="size-7" />
          </div>
          <h3 className="text-h3 font-bold text-slate-900 dark:text-white mb-2">
            {isWrongNetwork ? "Wrong Network Detected" : "Node Connection Lost"}
          </h3>
          <p className="text-body text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-8">
            {isWrongNetwork
              ? `Your wallet is currently connected to the wrong network. Please switch to ${isLocal ? "Hardhat Local" : "Arc Mainnet"} (chain ID ${expectedChainId}) to access the marketplace.`
              : error}
          </p>
          {isWrongNetwork ? (
            <Button
              variant="primary"
              className="px-8 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
              onClick={async () => {
                try {
                  if (expectedChainId) await switchNetwork(expectedChainId);
                } catch (err: any) {
                  console.error(err);
                }
              }}
            >
              Switch to {isLocal ? "Hardhat" : "Testnet"}
            </Button>
          ) : (
            <Button
              variant="primary"
              className="px-8 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
              onClick={() => window.location.reload()}
            >
              Reconnect to Node
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  if (requireWallet && !borrower && !lender) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 p-8 text-center">
        <User className="size-8 text-slate-400 mb-3" />
        <p className="text-small font-medium text-slate-500">
          Connect your wallet to view your personal activity.
        </p>
      </div>
    );
  }

  if (loans.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 p-12 text-center"
      >
        <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4 opacity-50">
          <Activity className="size-8 text-slate-400" />
        </div>
        <p className="text-h4 font-bold text-slate-600 dark:text-slate-400">
          {emptyMessage || "No Active Requests"}
        </p>
        {!emptyMessage && (
          <p className="mt-2 text-small text-slate-500 max-w-xs">
            The marketplace is currently quiet. Be the first to launch a new loan request.
          </p>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-5"
    >
      {loans.map((loan) => (
        <motion.div key={loan.id} variants={itemVariants}>
          <Card className="glass-card g-glass-hover overflow-hidden transition-all duration-300 border-slate-200/50 dark:border-slate-800/50 hover:border-primary-500/30 group">
            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row sm:items-stretch">
                {/* Left Side: Loan Info */}
                <div className="flex flex-1 flex-col p-7">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${loan.status === 'Requested' ? 'bg-amber-500/10 text-amber-500' :
                      loan.status === 'Active' ? 'bg-primary-500/10 text-primary-500' :
                        'bg-emerald-500/10 text-emerald-500'
                      }`}>
                      {loan.status}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <Clock className="size-3" />
                      {loan.duration} Days
                    </div>
                  </div>

                  <h3 className="text-h4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="text-glow-primary">{formatUsdc(loan.principal)}</span>
                    <span className="text-slate-400 font-medium">USDC Request</span>
                  </h3>

                  <div className="mt-6 flex flex-wrap gap-x-12 gap-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <TrendingUp className="size-3" />
                        Yield
                      </div>
                      <p className="text-body font-bold text-slate-900 dark:text-slate-100">{loan.interestRate}% APR</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <ArrowUpRight className="size-3" />
                        Liquidity
                      </div>
                      <p className="text-body font-bold text-slate-900 dark:text-slate-100">
                        {formatUsdc(loan.remaining && loan.remaining !== "0" ? loan.remaining : loan.principal)} USDC
                      </p>
                    </div>
                  </div>

                  <div className="mt-7 pt-5 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                        <User className="size-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {formatAddress(loan.borrower)}
                        </p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <ShieldCheck className="size-3 text-emerald-500" />
                          Reputation: <span className="font-bold text-slate-700 dark:text-slate-300">{scores[loan.borrower] ?? "—"}</span>
                        </p>
                      </div>
                    </div>

                    <div className="hidden sm:block">
                      <ArrowUpRight className="size-5 text-slate-300 dark:text-slate-700 group-hover:text-primary-500 transition-colors" />
                    </div>
                  </div>
                </div>

                {/* Right Side: Action Area */}
                <div className="flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800/50 bg-slate-50/[0.03] dark:bg-slate-900/10 p-7 sm:w-56 gap-3">
                  {loan.status === "Requested" && (
                    <Button
                      variant={address?.toLowerCase() === loan.borrower.toLowerCase() ? "secondary" : "primary"}
                      className={cn(
                        "w-full shadow-lg",
                        address?.toLowerCase() !== loan.borrower.toLowerCase() && "hover:shadow-primary-500/20"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setSelectedLoan(loan);
                        setConfirmAction("fund");
                        setFundAmount(formatUsdc((loan.remaining && loan.remaining !== "0") ? loan.remaining : loan.principal));
                        setFundError(null);
                        setConfirmOpen(true);
                      }}
                      disabled={actionLoading || address?.toLowerCase() === loan.borrower.toLowerCase()}
                    >
                      {address?.toLowerCase() === loan.borrower.toLowerCase() ? "Your Request" : "Fund Liquidity"}
                    </Button>
                  )}
                  {loan.status === "Active" && address?.toLowerCase() === loan.borrower.toLowerCase() && (
                    <Button
                      variant="primary"
                      className="w-full shadow-lg hover:shadow-primary-500/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setSelectedLoan(loan);
                        setConfirmAction("repay");
                        setConfirmOpen(true);
                      }}
                      disabled={actionLoading}
                    >
                      Settle Loan
                    </Button>
                  )}

                  <Link href={`/loans/${loan.id}`} className="w-full">
                    <Button variant="secondary" className="w-full bg-white/5 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800">
                      View Insights
                    </Button>
                  </Link>

                  {loan.status === "Repaid" && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                      <ShieldCheck className="size-3" />
                      Settled
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      <ConfirmModal
        open={confirmOpen}
        title={confirmAction === "fund" ? "Confirm funding" : "Confirm repayment"}
        description={
          confirmAction === "fund"
            ? `Fund loan ${selectedLoan ? formatAddress(selectedLoan.borrower) : ""} for ${selectedLoan ? formatUsdc(selectedLoan.principal) : ""
            } USDC?`
            : `Repay loan ${selectedLoan ? formatAddress(selectedLoan.borrower) : ""}?`
        }
        confirmLabel={confirmAction === "fund" ? "Fund" : "Repay"}
        cancelLabel="Cancel"
        confirmDisabled={confirmAction === "fund" && !!fundError}
        onCancel={() => {
          setConfirmOpen(false);
          setSelectedLoan(null);
          setConfirmAction(null);
        }}
        onConfirm={async () => {
          if (!selectedLoan || !confirmAction) return;
          setConfirmOpen(false);
          try {
            if (confirmAction === "fund") {
              const amountWei = parseUsdc(fundAmount);
              const remainingUnits = BigInt(selectedLoan.remaining ?? selectedLoan.principal);
              if (amountWei <= BigInt(0)) throw new Error("Enter an amount greater than 0 USDC.");
              if (amountWei > remainingUnits) throw new Error("Amount exceeds remaining funding needed.");

              await fundLoan(selectedLoan.id, amountWei);
              setToast({ message: `Funded loan ${formatAddress(selectedLoan.borrower)}`, type: "success" });
            } else {
              await repayLoan(selectedLoan.id);
              setToast({ message: `Repayment submitted for ${formatAddress(selectedLoan.borrower)}`, type: "success" });
            }
            setLoading(true);
            const updated = await fetchLoans();
            setLoans(updated);
          } catch (err: any) {
            setToast({ message: `Action failed: ${err?.message ?? String(err)}`, type: "error" });
          } finally {
            setSelectedLoan(null);
            setConfirmAction(null);
            setLoading(false);
          }
        }}
      >
        {confirmAction === "fund" && (
          <div className="mb-4">
            <label className="text-small text-slate-600 dark:text-slate-400">Amount to fund (USDC)</label>
            <input
              className="mt-1 w-full rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
              value={fundAmount}
              onChange={(e) => {
                setFundAmount(e.target.value);
                if (!selectedLoan) return;
                try {
                  const value = parseUsdc(e.target.value);
                  const remaining = BigInt(selectedLoan.remaining ?? selectedLoan.principal);
                  if (value <= BigInt(0)) {
                    setFundError("Enter an amount greater than 0 USDC");
                  } else if (value > remaining) {
                    setFundError("Amount exceeds remaining required");
                  } else {
                    setFundError(null);
                  }
                } catch {
                  setFundError("Enter an amount greater than 0");
                }
              }}
              placeholder="0.0"
              type="number"
              min="0"
              step="0.000001"
            />
            <p className="text-small text-slate-400 mt-2">Available for funding: {selectedLoan ? formatUsdc(selectedLoan.remaining ?? selectedLoan.principal) : "—"} USDC</p>
            {fundError && <p className="text-small text-red-500 mt-1 font-medium">{fundError}</p>}
          </div>
        )}
      </ConfirmModal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <TransactionNotice transaction={transaction} />
    </motion.div>
  );
}
