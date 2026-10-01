"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
    TrendingUp,
    Wallet,
    ArrowUpRight,
    ArrowDownLeft,
    Info,
    ShieldCheck,
    Activity,
    ChevronRight,
    PieChart
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Toast, ToastType } from "@/components/ui/Toast";
import { useWallet } from "@/contexts/WalletContext";
import { useLoans } from "@/hooks/useLoans";
import { formatUsdc } from "@/lib/usdc";
import { TransactionNotice } from "@/components/ui/TransactionNotice";

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 1.5, ease: [0.22, 1, 0.36, 1] }
    }
};

export default function EarnPage() {
    const { isConnected, address } = useWallet();
    const { fetchPoolStats, fetchUsdcBalance, depositToPool, withdrawFromPool, loading, transaction } = useLoans();

    const [poolStats, setPoolStats] = useState<any>(null);
    const [walletUsdcBalance, setWalletUsdcBalance] = useState("0");
    const [depositAmount, setDepositAmount] = useState("");
    const [withdrawShares, setWithdrawShares] = useState("");
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

    const refreshStats = useCallback(async () => {
        const [stats, balance] = await Promise.all([
            fetchPoolStats(),
            address ? fetchUsdcBalance(address) : Promise.resolve("0"),
        ]);
        setPoolStats(stats);
        setWalletUsdcBalance(balance);
    }, [address, fetchPoolStats, fetchUsdcBalance]);

    useEffect(() => {
        if (isConnected && address) {
            refreshStats();
        } else {
            setPoolStats(null);
            setWalletUsdcBalance("0");
        }
    }, [isConnected, address, refreshStats]);

    const handleDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!depositAmount || parseFloat(depositAmount) <= 0) return;
        try {
            await depositToPool(depositAmount);
            setToast({ message: "Successfully deposited to vault!", type: "success" });
            setDepositAmount("");
            refreshStats();
        } catch (err: any) {
            setToast({ message: err?.message || "Deposit failed", type: "error" });
        }
    };

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!withdrawShares || parseFloat(withdrawShares) <= 0) return;
        try {
            await withdrawFromPool(withdrawShares);
            setToast({ message: "Withdrawal successful!", type: "success" });
            setWithdrawShares("");
            refreshStats();
        } catch (err: any) {
            setToast({ message: err?.message || "Withdrawal failed", type: "error" });
        }
    };

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

            <motion.div variants={itemVariants} className="flex flex-col gap-2 mb-12">
                <h1 className="text-h2 font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                    <TrendingUp className="size-8 text-primary-500" />
                    Lend & Earn
                </h1>
                <p className="max-w-2xl text-body text-slate-600 dark:text-slate-400">
                    Provide liquidity back the CredTrust Arc protocol and earn passive APY from borrower repayments globally. No manual matching required.
                </p>
            </motion.div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                {/* Pool Overview Stats */}
                <motion.div variants={itemVariants} className="lg:col-span-8 space-y-8">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                        <Card variant="elevated" className="glass-card bg-primary-500/5 border-primary-500/10">
                            <CardContent className="pt-6">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">Total Liquidity</p>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-h3 font-bold text-slate-900 dark:text-white">
                                        {poolStats ? formatUsdc(poolStats.totalLiquidity) : "—"}
                                    </span>
                                    <span className="text-xs font-medium text-slate-500">USDC</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card variant="elevated" className="glass-card">
                            <CardContent className="pt-6">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Average Pool APY</p>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-h3 font-bold text-emerald-600 dark:text-emerald-400">~12.4%</span>
                                    <span className="text-xs font-medium text-slate-500">Fixed</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card variant="elevated" className="glass-card">
                            <CardContent className="pt-6">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Your Share Value</p>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-h3 font-bold text-slate-900 dark:text-white">
                                        {poolStats ? formatUsdc(poolStats.userBalance) : "—"}
                                    </span>
                                    <span className="text-xs font-medium text-slate-500">USDC</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Deposit/Withdraw UI */}
                    <Card variant="elevated" className="glass-card border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
                        <div className="flex border-b border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => setActiveTab("deposit")}
                                className={`flex-1 py-4 text-small font-bold transition-colors ${activeTab === "deposit" ? "bg-primary-500/5 text-primary-600 border-b-2 border-primary-500" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                            >
                                Deposit Funds
                            </button>
                            <button
                                onClick={() => setActiveTab("withdraw")}
                                className={`flex-1 py-4 text-small font-bold transition-colors ${activeTab === "withdraw" ? "bg-primary-500/5 text-primary-600 border-b-2 border-primary-500" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                            >
                                Withdraw Earnings
                            </button>
                        </div>

                        <CardContent className="py-10 px-8">
                            {!isConnected ? (
                                <div className="py-12 text-center">
                                    <Wallet className="size-12 text-slate-300 mx-auto mb-4" />
                                    <h3 className="text-h4 font-bold text-slate-900 dark:text-white">Wallet not connected</h3>
                                    <p className="text-small text-slate-500 mt-2">Connect to start providing liquidity.</p>
                                </div>
                            ) : activeTab === "deposit" ? (
                                <form onSubmit={handleDeposit} className="space-y-8">
                                    <div className="space-y-4">
                                        <Input
                                            label="Deposit Amount (USDC)"
                                            placeholder="0.00"
                                            type="number"
                                            step="0.000001"
                                            value={depositAmount}
                                            onChange={(e) => setDepositAmount(e.target.value)}
                                        />
                                        <p className="text-xs text-slate-500">Wallet USDC balance: {formatUsdc(walletUsdcBalance)} USDC</p>
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                            <span>Protocol Fee: 0%</span>
                                            <span>Slippage Protection: 0.1%</span>
                                        </div>
                                    </div>
                                    <Button type="submit" size="lg" className="w-full py-6 glow-primary" loading={loading}>
                                        <ArrowUpRight className="size-4 mr-2" />
                                        Approve & Deposit USDC
                                    </Button>
                                </form>
                            ) : (
                                <form onSubmit={handleWithdraw} className="space-y-8">
                                    <div className="space-y-4">
                                        <Input
                                            label="Shares to Burn"
                                            placeholder={`Max: ${poolStats ? poolStats.userShares : "0"}`}
                                            type="number"
                                            value={withdrawShares}
                                            onChange={(e) => setWithdrawShares(e.target.value)}
                                        />
                                        <p className="text-[10px] text-slate-500 italic">
                                            Burning shares returns your initial principal plus your proportional share of globally earned interest.
                                        </p>
                                    </div>
                                    <Button type="submit" size="lg" variant="secondary" className="w-full py-6" loading={loading}>
                                        <ArrowDownLeft className="size-4 mr-2" />
                                        Withdraw Liquidity
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Sidebar Info */}
                <motion.div variants={itemVariants} className="lg:col-span-4 space-y-8">
                    <Card className="bg-slate-950 text-white overflow-hidden relative border border-primary-500/30">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <PieChart className="size-24" />
                        </div>
                        <CardContent className="pt-8">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-1 px-2 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">Live Yield</div>
                            </div>
                            <h4 className="text-h4 font-bold mb-4">How it works</h4>
                            <ul className="space-y-4">
                                {[
                                    { icon: <ShieldCheck className="size-4" />, text: "Automated risk management via Reputation Scores." },
                                    { icon: <Activity className="size-4" />, text: "Instant diversification across all active loans." },
                                    { icon: <ChevronRight className="size-4" />, text: "Withdraw at any time provided pool liquidity is available." }
                                ].map((item, i) => (
                                    <li key={i} className="flex gap-3 items-start">
                                        <div className="text-primary-400 mt-1">{item.icon}</div>
                                        <p className="text-xs text-white/70 leading-relaxed font-medium">{item.text}</p>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card variant="outlined" className="bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <Info className="size-4 text-primary-500" />
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Protocol Vault Info</h4>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">Utilization Rate</span>
                                <span className="font-bold text-slate-900 dark:text-white">64.2%</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">Reserved for Defaults</span>
                                <span className="font-bold text-slate-900 dark:text-white">5.0%</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">Security Audit</span>
                                <span className="font-bold text-emerald-600">Passed</span>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </motion.div>
    );
}
