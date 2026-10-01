"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Landmark, Info, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toast, ToastType } from "@/components/ui/Toast";
import { useWallet } from "@/contexts/WalletContext";
import { useLoans } from "@/hooks/useLoans";
import { TransactionNotice } from "@/components/ui/TransactionNotice";
import { cn } from "@/lib/utils";

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
      ease: "easeOut"
    }
  }
};

const DURATION_OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
];

export default function CreateLoanPage() {
  const router = useRouter();
  const { isConnected, address } = useWallet();
  const { createLoan, borrowFromPool, fetchCreditScore, getAlgorithmicInterestRate, loading, transaction } = useLoans();

  const [amount, setAmount] = useState("");
  const [interestRate, setInterestRate] = useState<string>("");
  const [duration, setDuration] = useState("");
  const [fundingSource, setFundingSource] = useState<"p2p" | "pool">("pool");
  const [creditScore, setCreditScore] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      fetchCreditScore(address).then(setCreditScore);
      getAlgorithmicInterestRate(address).then(rate => setInterestRate(rate.toString()));
    }
  }, [isConnected, address, fetchCreditScore, getAlgorithmicInterestRate]);

  const repaymentPreview = useMemo(() => {
    const amountNum = parseFloat(amount);
    const rateNum = parseFloat(interestRate);
    const durationNum = parseInt(duration, 10);

    if (isNaN(amountNum) || isNaN(rateNum) || isNaN(durationNum) || amountNum <= 0) {
      return null;
    }

    const interest = amountNum * (rateNum / 100);
    const total = amountNum + interest;

    // Calculate deadline date
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + durationNum);

    return {
      interest: interest.toFixed(4),
      total: total.toFixed(4),
      deadline: deadline.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    };
  }, [amount, interestRate, duration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(amount);

    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (!duration) {
      setError("Please select a duration");
      return;
    }

    try {
      if (fundingSource === "pool") {
        await borrowFromPool({
          amount,
          duration: parseInt(duration, 10),
        });
        setToast({ message: "Instant liquidity secured!", type: "success" });
      } else {
        await createLoan({
          amount,
          duration: parseInt(duration, 10),
        });
        setToast({ message: "Loan request created successfully!", type: "success" });
      }
      setTimeout(() => router.push("/loans?created=1"), 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create loan";
      setError(msg);
      setToast({ message: msg, type: "error" });
    }
  };

  return (
    <motion.div
      className="mx-auto max-w-container-md px-4 py-12 sm:px-6 lg:px-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <motion.div variants={itemVariants}>
        <Link
          href="/loans"
          className="group mb-8 inline-flex items-center gap-2 text-small font-medium text-slate-500 dark:text-slate-400 transition-colors hover:text-primary-600 dark:hover:text-primary-400"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
          Back to loans
        </Link>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col gap-2">
        <h1 className="text-h2 font-bold tracking-tight text-slate-900 dark:text-white">Create Loan Request</h1>
        <p className="max-w-xl text-body text-slate-600 dark:text-slate-400">
          Securely request USDC liquidity. Your credit reputation determines your standing in the CredTrust Arc ecosystem.
        </p>
      </motion.div>

      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card variant="elevated" className="glass-card border-slate-200/60 dark:border-slate-800/60">
            <CardHeader className="pb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary-500/10 dark:bg-primary-500/5 border border-primary-500/20">
                  <Landmark className="size-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <CardTitle className="dark:text-white">Loan Configuration</CardTitle>
                  <p className="text-small text-slate-500 dark:text-slate-400">
                    Define the terms for your liquidity request.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!isConnected ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-6 rounded-2xl bg-slate-100 dark:bg-slate-800/50 p-6 border border-slate-200 dark:border-slate-800">
                    <AlertCircle className="size-10 text-slate-400 dark:text-slate-600" />
                  </div>
                  <h3 className="text-h4 font-bold text-slate-900 dark:text-white">Wallet not connected</h3>
                  <p className="mt-2 text-small text-slate-500 dark:text-slate-400 max-w-xs">
                    Connect an EVM-compatible wallet to initialize an on-chain loan request.
                  </p>
                  <Button variant="primary" className="mt-8 glow-primary" onClick={() => (window as any).ethereum?.request({ method: 'eth_requestAccounts' })}>
                    Connect Now
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-10">
                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                    <Input
                      label="Principal Amount (USDC)"
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="e.g. 500.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="dark:bg-slate-900/40"
                    />
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary-500">Protocol Assigned Rate</p>
                      <div className="rounded-xl bg-primary-500/5 p-4 border border-primary-500/10 dark:bg-primary-500/[0.03]">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-h4 font-bold text-slate-900 dark:text-white">{interestRate || "—"}%</span>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Locked</span>
                        </div>
                        <p className="mt-2 text-[10px] text-slate-500 leading-tight">
                          The fixed loan rate is based on your Credit Reputation Score ({creditScore ?? "..."}).
                        </p>
                      </div>
                    </div>
                  </div>

                  <Select
                    label="Repayment Period"
                    options={DURATION_OPTIONS}
                    placeholder="Choose duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="dark:bg-slate-900/40"
                  />

                  <div className="flex flex-col gap-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                    <div>
                      <h4 className="text-small font-bold text-slate-900 dark:text-white">Funding Source</h4>
                      <p className="text-xs text-slate-500">Pick how your loan gets funded.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setFundingSource("pool")}
                        className={cn(
                          "flex flex-col gap-2 p-4 rounded-xl border-2 transition-all text-left",
                          fundingSource === "pool" ? "bg-primary-500/10 border-primary-500 shadow-glow-primary" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <TrendingUp className={cn("size-5", fundingSource === "pool" ? "text-primary-500" : "text-slate-400")} />
                          {fundingSource === "pool" && <CheckCircle2 className="size-4 text-primary-500" />}
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Institutional Pool</span>
                        <span className="text-[10px] text-slate-500">Instant funding from the protocol vault.</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFundingSource("p2p")}
                        className={cn(
                          "flex flex-col gap-2 p-4 rounded-xl border-2 transition-all text-left",
                          fundingSource === "p2p" ? "bg-primary-500/10 border-primary-500 shadow-glow-primary" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <Landmark className={cn("size-5", fundingSource === "p2p" ? "text-primary-500" : "text-slate-400")} />
                          {fundingSource === "p2p" && <CheckCircle2 className="size-4 text-primary-500" />}
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Marketplace (P2P)</span>
                        <span className="text-[10px] text-slate-500">Wait for a specific lender to fund you manually.</span>
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-3 rounded-xl bg-orange-500/10 p-4 text-small text-orange-600 dark:text-orange-400 border border-orange-500/20"
                    >
                      <AlertCircle className="size-4 shrink-0" />
                      {error}
                    </motion.div>
                  )}

                  <TransactionNotice transaction={transaction} />

                  <div className="flex flex-col gap-4 sm:flex-row pt-4">
                    <Button
                      type="submit"
                      loading={loading}
                      size="lg"
                      className="flex-1 sm:flex-none py-6 px-8 glow-primary"
                    >
                      {fundingSource === "pool" ? "Secure Instant Liquidity" : "Initialize Marketplace Request"}
                    </Button>
                    <Link href="/loans" className="flex-1 sm:flex-none">
                      <Button
                        type="button"
                        variant="secondary"
                        size="lg"
                        className="w-full py-6 px-8"
                      >
                        Cancel
                      </Button>
                    </Link>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="flex flex-col gap-8">
          {/* Credit Score Card */}
          <motion.div variants={itemVariants}>
            <Card className="bg-slate-950 text-white overflow-hidden relative border border-primary-500/30 shadow-[0_0_40px_-15px_rgba(59,130,246,0.3)]">
              {/* Background Glow */}
              <div className="absolute -top-12 -right-12 size-48 rounded-full bg-primary-600/20 blur-3xl" />

              <CardContent className="pt-8 relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-md bg-white/10">
                    <CheckCircle2 className="size-4 text-primary-400" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary-400">Your Standing</p>
                </div>

                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-h1 font-bold text-white text-glow-primary">
                    {creditScore !== null ? creditScore : "—"}
                  </span>
                  <span className="text-h4 text-white/40 font-medium">/ 1000</span>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: creditScore ? `${(creditScore / 1000) * 100}%` : 0 }}
                      transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full bg-gradient-to-r from-primary-600 to-indigo-400"
                    />
                  </div>
                  <p className="text-[10px] text-white/50 leading-relaxed italic">
                    CredTrust Arc reputation is immutable and builds with every successful settlement.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Repayment Preview Card */}
          <motion.div variants={itemVariants}>
            <Card variant="outlined" className="glass bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800/80">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Info className="size-4 text-primary-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Payment Breakdown</h4>
                </div>
              </CardHeader>
              <CardContent>
                {repaymentPreview ? (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Interest</span>
                        <p className="font-medium text-slate-900 dark:text-white">{repaymentPreview.interest} USDC</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Total Due</span>
                        <p className="font-bold text-primary-600 dark:text-primary-400">{repaymentPreview.total} USDC</p>
                      </div>
                    </div>
                    <div className="mt-2 rounded-xl bg-slate-900/5 dark:bg-slate-100/5 p-4 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Estimated Deadline</span>
                      <span className="text-body font-bold text-slate-900 dark:text-slate-200">{repaymentPreview.deadline}</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <p className="text-xs font-medium text-slate-400 italic">
                      Configure terms to calculate breakdown
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Tips Card */}
          <motion.div variants={itemVariants}>
            <div className="rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/[0.03] p-6 border border-indigo-500/10 dark:border-indigo-500/10">
              <div className="flex gap-4">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0 h-fit">
                  <Info className="size-4" />
                </div>
                <div>
                  <h4 className="text-small font-bold text-slate-900 dark:text-white">Reputation Power</h4>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Higher scores unlock lower interest rates automatically. Repay this loan on time to lower your future borrowing costs across the protocol.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
