"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  ShieldCheck,
  Calendar,
  CreditCard,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Landmark
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Toast, ToastType } from "@/components/ui/Toast";
import { useWallet } from "@/contexts/WalletContext";
import { useLoans } from "@/hooks/useLoans";
import { formatUsdc } from "@/lib/usdc";
import { TransactionNotice } from "@/components/ui/TransactionNotice";
import type { Loan } from "@/types/loan";

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
  return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
}

export default function LoanDetailPage() {
  const { address: loanAddress } = useParams();
  const router = useRouter();
  const { address: userAddress, isConnected } = useWallet();
  const {
    fetchLoanDetails,
    fetchCreditScore,
    fundLoan,
    repayLoan,
    markDefaulted,
    actionLoading,
    transaction,
  } = useLoans();

  const [loan, setLoan] = useState<(Loan & { totalRepayment: string }) | null>(null);
  const [borrowerScore, setBorrowerScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const isBorrower = useMemo(() =>
    loan && userAddress && loan.borrower.toLowerCase() === userAddress.toLowerCase(),
    [loan, userAddress]);

  const isLender = useMemo(() =>
    loan && userAddress && loan.lender?.toLowerCase() === userAddress.toLowerCase(),
    [loan, userAddress]);

  useEffect(() => {
    if (loanAddress && typeof loanAddress === "string") {
      setLoading(true);
      fetchLoanDetails(loanAddress)
        .then(async (data) => {
          setLoan(data);
          const score = await fetchCreditScore(data.borrower);
          setBorrowerScore(score);
        })
        .catch((err) => {
          setToast({ message: "Failed to load loan details", type: "error" });
          console.error(err);
        })
        .finally(() => setLoading(false));
    }
  }, [loanAddress, fetchLoanDetails, fetchCreditScore]);

  const handleFund = async () => {
    if (!loan) return;
    try {
      const amount = loan.remaining && loan.remaining !== "0" ? loan.remaining : loan.principal;
      await fundLoan(loan.id, BigInt(amount));
      setToast({ message: "Loan funded successfully!", type: "success" });
      // Refresh data
      const updated = await fetchLoanDetails(loan.id);
      setLoan(updated);
    } catch (err: any) {
      setToast({ message: err?.message || "Funding failed", type: "error" });
    }
  };

  const handleRepay = async () => {
    if (!loan) return;
    try {
      await repayLoan(loan.id);
      setToast({ message: "Repayment successful!", type: "success" });
      // Refresh data
      const updated = await fetchLoanDetails(loan.id);
      setLoan(updated);
    } catch (err: any) {
      setToast({ message: err?.message || "Repayment failed", type: "error" });
    }
  };

  const handleMarkDefaulted = async () => {
    if (!loan) return;
    try {
      await markDefaulted(loan.id);
      setToast({ message: "Loan marked as defaulted", type: "success" });
      const updated = await fetchLoanDetails(loan.id);
      setLoan(updated);
    } catch (err: any) {
      setToast({ message: err?.message || "Action failed", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Activity className="size-8 animate-pulse text-primary-600 dark:text-primary-400" />
          <p className="text-body text-gray-500 dark:text-gray-400">Fetching loan data...</p>
        </div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="mx-auto max-w-container-md px-4 py-12 text-center">
        <h1 className="text-h3 font-bold text-gray-900 dark:text-white">Loan Not Found</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">The loan request you are looking for does not exist or the address is invalid.</p>
        <Link href="/loans" className="mt-8 inline-block text-primary-600 dark:text-primary-400 hover:underline">
          Return to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      className="mx-auto max-w-container-lg px-4 py-12 sm:px-6 lg:px-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <TransactionNotice transaction={transaction} />

      {/* Navigation & Header */}
      <motion.div variants={itemVariants} className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/loans"
          className="group inline-flex items-center gap-2 text-small font-medium text-gray-500 dark:text-gray-400 transition-colors hover:text-primary-600 dark:hover:text-primary-400"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
          Back to Marketplace
        </Link>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-sm ${loan.status === "Requested" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50" :
            loan.status === "Active" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50" :
              loan.status === "Repaid" ? "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/50" :
                "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/50"
            }`}>
            {loan.status}
          </span>
          <span className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800/50 px-2 py-1 rounded">ID: {loan.id.slice(0, 8)}...</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div variants={itemVariants}>
            <Card variant="elevated" className="glass-card border-slate-200/60 dark:border-slate-800/60">
              <CardHeader className="border-b border-slate-100/50 dark:border-slate-800/50 pb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-h2 font-bold text-slate-900 dark:text-white flex items-baseline gap-2">
                      <span className="text-glow-primary">{formatUsdc(loan.principal)}</span>
                      <span className="text-h4 text-slate-500">USDC</span>
                    </CardTitle>
                    <p className="mt-2 text-small text-slate-500 dark:text-slate-400 flex items-center gap-4">
                      <span className="flex items-center gap-1.5"><Clock className="size-3.5" /> {loan.duration} days</span>
                      <span className="flex items-center gap-1.5"><Activity className="size-3.5" /> {loan.interestRate}% APR</span>
                    </p>
                  </div>
                  <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10 dark:bg-primary-500/5 border border-primary-500/20">
                    <Landmark className="size-8 text-primary-600 dark:text-primary-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-10">
                <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Borrower Address</p>
                    <div className="flex items-center gap-2 group">
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                        <User className="size-4" />
                      </div>
                      <span className="text-body font-mono text-slate-900 dark:text-slate-200">{formatAddress(loan.borrower)}</span>
                      {isBorrower && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-600 dark:text-primary-400 uppercase">You</span>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Lender{loan.lendersCount > 1 ? "s" : ""}</p>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                        <ShieldCheck className="size-4" />
                      </div>
                      <span className="text-body font-mono text-slate-900 dark:text-slate-200">
                        {loan.lendersCount > 1 ? (
                          <span className="text-slate-700 dark:text-slate-300">Multiple Lenders ({loan.lendersCount})</span>
                        ) : loan.lender ? (
                          formatAddress(loan.lender)
                        ) : (
                          <span className="text-slate-400 italic">Waiting...</span>
                        )}
                      </span>
                      {isLender && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-600 dark:text-primary-400 uppercase">You</span>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Repayment Date</p>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                        <Calendar className="size-4" />
                      </div>
                      <span className="text-body text-slate-900 dark:text-slate-200 font-medium">
                        {loan.repaymentDeadline ? new Date(loan.repaymentDeadline * 1000).toLocaleDateString(undefined, { dateStyle: 'long' }) : <span className="text-slate-400 italic">Not set</span>}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Full Repayment Amount</p>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400">
                        <CreditCard className="size-4" />
                      </div>
                      <span className="text-body text-slate-900 dark:text-slate-200 font-bold">
                        {formatUsdc(loan.totalRepayment)} USDC
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-12 border-t border-slate-100 dark:border-slate-800/50 pt-10">
                  {loan.status === "Requested" && (
                    <div className="flex flex-col gap-6">
                      <div className="rounded-2xl bg-primary-500/5 dark:bg-primary-500/[0.03] p-6 border border-primary-500/10 dark:border-primary-500/10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 transition-transform group-hover:scale-110">
                          <Landmark className="size-16" />
                        </div>
                        <h4 className="text-small font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                          <Activity className="size-4 text-primary-500" />
                          Lender Opportunity
                        </h4>
                        <p className="text-small text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg">
                          Funding this loan transfers <span className="text-slate-900 dark:text-slate-200 font-bold">{formatUsdc(loan.principal)} USDC</span> to the borrower. You will receive <span className="text-primary-500 font-bold">{formatUsdc(loan.totalRepayment)} USDC</span> upon completion.
                        </p>
                      </div>
                      <div className="flex flex-col gap-3">
                        <Button
                          size="lg"
                          className="w-full sm:w-auto glow-primary"
                          onClick={handleFund}
                          loading={actionLoading}
                          disabled={isBorrower || !isConnected}
                        >
                          {isBorrower ? "You cannot fund your own loan" : "Fund This Loan Request"}
                        </Button>
                        {!isConnected && (
                          <p className="text-xs text-slate-500 dark:text-slate-500 flex items-center gap-1.5 justify-center sm:justify-start">
                            <AlertTriangle className="size-3.5" />
                            Please connect your wallet to fund this request
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {loan.status === "Active" && isBorrower && (
                    <div className="flex flex-col gap-6">
                      <div className="rounded-2xl bg-amber-500/5 p-6 border border-amber-500/10 relative overflow-hidden">
                        <h4 className="text-small font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                          <Clock className="size-4 text-amber-500" />
                          Repayment Due
                        </h4>
                        <p className="text-small text-slate-600 dark:text-slate-400 leading-relaxed">
                          Your loan is active. Ensure you repay the total <span className="font-bold text-slate-900 dark:text-white">{formatUsdc(loan.totalRepayment)} USDC</span> before the deadline to protect your Credit Reputation.
                        </p>
                      </div>
                      <Button
                        size="lg"
                        variant="primary"
                        className="w-full sm:w-auto glow-primary"
                        onClick={handleRepay}
                        loading={actionLoading}
                      >
                        Repay Full Amount ({formatUsdc(loan.totalRepayment)} USDC)
                      </Button>
                    </div>
                  )}

                  {loan.status === "Repaid" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-4 rounded-2xl bg-emerald-500/10 p-6 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                        <CheckCircle2 className="size-6" />
                      </div>
                      <div>
                        <p className="font-bold">Loan Fully Repaid</p>
                        <p className="text-small opacity-80">This transaction is complete. Reputation points have been credited to the borrower.</p>
                      </div>
                    </motion.div>
                  )}

                  {loan.status === "Active" && (
                    <div className="mt-8 flex flex-col gap-4">
                      {/* Grace Period Logic */}
                      {(() => {
                        const now = Math.floor(Date.now() / 1000);
                        const deadline = loan.repaymentDeadline || 0;
                        const GRACE_PERIOD = 3 * 24 * 60 * 60; // 3 days
                        const isOverdue = now > deadline;
                        const canLiquidate = now > deadline + GRACE_PERIOD;
                        const isLender = loan.lender?.toLowerCase() === userAddress?.toLowerCase();

                        if (!isOverdue) return null;

                        return (
                          <>
                            <div className={`rounded-2xl p-4 border ${canLiquidate ? "bg-rose-500/10 border-rose-500/20" : "bg-amber-500/10 border-amber-500/20"}`}>
                              <p className={`text-xs ${canLiquidate ? "text-rose-700 dark:text-rose-400" : "text-amber-700 dark:text-amber-400"}`}>
                                <strong>{canLiquidate ? "Liquidatable:" : "Overdue:"}</strong>
                                {canLiquidate
                                  ? " The grace period has ended. This loan can now be liquidated by any community member to protect protocol health."
                                  : ` The borrower is overdue. Decentralized liquidation will unlock in ${Math.ceil((deadline + GRACE_PERIOD - now) / 86400)} days.`}
                              </p>
                            </div>
                            {(canLiquidate || isLender) && (
                              <Button
                                variant="destructive"
                                size="lg"
                                className="w-full sm:w-auto glow-error flex items-center justify-center gap-2"
                                onClick={handleMarkDefaulted}
                                loading={actionLoading}
                              >
                                <AlertTriangle className="size-4" />
                                {canLiquidate ? "Execute Community Liquidation" : "Declare Default (Lender Only)"}
                              </Button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Timeline */}
          <motion.div variants={itemVariants} className="space-y-6 pt-4">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Transaction Journey</h4>
            <div className="relative space-y-10 pl-10 before:absolute before:inset-0 before:ml-[1.15rem] before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {/* Request */}
              <div className="relative flex items-center justify-between gap-6 group">
                <div className="absolute -left-10 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 ring-4 ring-slate-100 dark:ring-slate-900 border border-slate-700">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(59,130,246,1)]" />
                </div>
                <div>
                  <p className="text-body font-bold text-slate-900 dark:text-white">Loan Request Published</p>
                  <p className="text-small text-slate-500 dark:text-slate-400">The smart contract was initialized and added to the marketplace.</p>
                </div>
              </div>

              {/* Funding */}
              <div className="relative flex items-center justify-between gap-6 group">
                <div className={`absolute -left-10 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 ring-4 ring-slate-100 dark:ring-slate-900 border ${loan.fundedAt ? "border-emerald-500" : "border-slate-700"}`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${loan.fundedAt ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]" : "bg-slate-700"}`} />
                </div>
                <div>
                  <p className={`text-body font-bold ${loan.fundedAt ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-600"}`}>Disbursement to Borrower</p>
                  <p className="text-small text-slate-500 dark:text-slate-400">
                    {loan.fundedAt ? `Funds sent to borrower on ${new Date(loan.fundedAt * 1000).toLocaleDateString()}` : "Waiting for lender to commit funds."}
                  </p>
                </div>
              </div>

              {/* Completion */}
              <div className="relative flex items-center justify-between gap-6">
                <div className={`absolute -left-10 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 ring-4 ring-slate-100 dark:ring-slate-900 border ${loan.status === "Repaid" ? "border-emerald-500" : "border-slate-700"}`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${loan.status === "Repaid" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]" : "bg-slate-700"}`} />
                </div>
                <div>
                  <p className={`text-body font-bold ${loan.status === "Repaid" ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-600"}`}>Contract Settlement</p>
                  <p className="text-small text-slate-500 dark:text-slate-400">
                    {loan.status === "Repaid" ? "Loan was successfully repaid and contract closed." : "Awaiting final settlement of principal and interest."}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <motion.div variants={itemVariants}>
            <Card className="bg-slate-950 text-white overflow-hidden relative border border-primary-500/30 shadow-[0_0_40px_-15px_rgba(59,130,246,0.3)]">
              {/* Background Glow */}
              <div className="absolute -top-12 -right-12 size-48 rounded-full bg-primary-600/20 blur-3xl" />
              <div className="absolute -bottom-12 -left-12 size-48 rounded-full bg-indigo-600/10 blur-3xl" />

              <CardContent className="pt-8 relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-md bg-white/10">
                    <ShieldCheck className="size-4 text-primary-400" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary-400">CredTrust Arc Reputation</p>
                </div>

                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-h1 font-bold text-white text-glow-primary">{borrowerScore ?? "—"}</span>
                  <span className="text-h4 text-white/40 font-medium">/ 1000</span>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: borrowerScore ? `${(borrowerScore / 1000) * 100}%` : 0 }}
                      transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                      className="h-full bg-gradient-to-r from-primary-600 to-indigo-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                    />
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed italic">
                    &ldquo;Higher reputation scores unlock lower interest rates and faster funding cycles across the ecosystem.&rdquo;
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card variant="outlined" className="glass bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800/80">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">On-Chain Safety</h4>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    "Verify the borrower's credit score history.",
                    "No physical collateral - purely reputation-based.",
                    "All commitments are settled via smart contracts."
                  ].map((tip, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-tight">{tip}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
