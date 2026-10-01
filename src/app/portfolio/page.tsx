"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useLoans } from "@/hooks/useLoans";
import type { Loan } from "@/types/loan";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";
import { Briefcase, Wallet as WalletIcon, ArrowUpRight, ArrowDownRight, Activity, ShieldCheck, LineChart } from "lucide-react";
import Link from "next/link";
import { formatUsdc } from "@/lib/usdc";

const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 }
};

export default function PortfolioPage() {
    const { address, isConnected, openPicker } = useWallet();
    const { fetchCreditScore, fetchLoans, fetchPoolStats, fetchUsdcBalance, isConfigured } = useLoans();

    const [borrowedLoans, setBorrowedLoans] = useState<Loan[]>([]);
    const [fundedLoans, setFundedLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const [walletBalance, setWalletBalance] = useState<string | null>(null);
    const [suppliedBalance, setSuppliedBalance] = useState<string | null>(null);
    const [creditScore, setCreditScore] = useState<number | null>(null);
    const [readError, setReadError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        setBorrowedLoans([]);
        setFundedLoans([]);
        const load = async () => {
            if (!isConnected || !address) {
                setWalletBalance(null);
                setSuppliedBalance(null);
                setCreditScore(null);
                setReadError(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            setReadError(null);
            const [balanceResult, poolResult, scoreResult, loansResult] = await Promise.allSettled([
                fetchUsdcBalance(address, true),
                fetchPoolStats(address),
                fetchCreditScore(address, true),
                fetchLoans(true),
            ]);
            if (!mounted) return;

            const account = address.toLowerCase();
            const failures: string[] = [];
            if (balanceResult.status === "fulfilled") setWalletBalance(balanceResult.value);
            else failures.push("Wallet balance");
            if (poolResult.status === "fulfilled" && poolResult.value) setSuppliedBalance(poolResult.value.userBalance);
            else failures.push("supplied balance");
            if (scoreResult.status === "fulfilled") setCreditScore(scoreResult.value);
            else failures.push("credit score");
            if (loansResult.status === "fulfilled") {
                setBorrowedLoans(loansResult.value.filter((loan) => loan.borrower.toLowerCase() === account));
                setFundedLoans(loansResult.value.filter((loan) =>
                    loan.lenders?.some((lender) => lender.toLowerCase() === account) || loan.lender?.toLowerCase() === account
                ));
            } else failures.push("loan records");
            if (!isConfigured) failures.push("contract configuration");
            if (failures.length) setReadError(`Could not load ${failures.join(", ")}.`);
            setLoading(false);
        };
        load();
        return () => { mounted = false; };
    }, [isConnected, address, fetchCreditScore, fetchLoans, fetchPoolStats, fetchUsdcBalance, isConfigured]);

    const activeBorrowedLoans = borrowedLoans.filter((loan) => loan.status === "Active" || loan.status === "Funded");
    const activeFundedLoans = fundedLoans.filter((loan) => loan.status === "Active" || loan.status === "Funded");
    const totalBorrowed = activeBorrowedLoans.reduce((sum, loan) => sum + BigInt(loan.principal), BigInt(0));
    const activeLoanCount = activeBorrowedLoans.length + activeFundedLoans.length;

    return (
        <div className="relative isolate min-h-screen bg-transparent pb-24">
            {/* Background Decorative Glow */}
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] size-[30%] rounded-full bg-primary-500/10 blur-[100px]" />
            </div>

            <div className="mx-auto max-w-container-xl px-4 py-12 sm:px-6 lg:px-8">
                <motion.div initial="hidden" animate="visible" variants={containerVariants} className="flex flex-col gap-8">

                    <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                        <h1 className="text-h2 font-bold tracking-tight text-slate-900 dark:text-white">
                            My <span className="text-gradient-primary">Portfolio</span>
                        </h1>
                        <p className="mt-2 text-body text-slate-600 dark:text-slate-400">
                            Live wallet, lending, borrowing, and credit account data.
                        </p>
                        </div>
                        {!isConnected && <Button variant="primary" onClick={openPicker}>Connect Wallet</Button>}
                    </motion.div>

                    {!isConnected && <motion.div variants={itemVariants} className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/30">
                        <WalletIcon className="mx-auto mb-2 size-7 text-primary-500" />
                        <p className="font-semibold text-slate-900 dark:text-white">Connect Wallet to View Account Data</p>
                        <p className="mt-1 text-small text-slate-500">Portfolio remains available; account values appear after connecting.</p>
                    </motion.div>}
                    {readError && isConnected && <p role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-small text-amber-800 dark:text-amber-300">{readError}</p>}

                    {/* KPI Cards */}
                    <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        <Card className="glass-card flex flex-col justify-between overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <p className="text-small font-medium text-slate-500 dark:text-slate-400">Wallet USDC</p>
                                    <div className="rounded-full bg-red-500/10 p-2 text-red-500 dark:bg-red-500/20 dark:text-red-400">
                                        <WalletIcon className="size-4" />
                                    </div>
                                </div>
                                <div className="mt-4 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                                    <span className="min-w-0 max-w-full break-all text-2xl font-bold leading-tight text-slate-900 dark:text-white">{!isConnected ? "—" : loading ? "Loading..." : walletBalance === null ? "Unavailable" : formatUsdc(walletBalance)}</span>
                                    <span className="shrink-0 text-small font-medium text-slate-500">USDC</span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">Available USDC in connected wallet</p>
                            </CardContent>
                        </Card>

                        <Card className="glass-card flex flex-col justify-between overflow-hidden relative">
                            <div className="absolute -right-4 -top-4 size-24 rounded-full bg-primary-500/10 blur-2xl" />
                            <CardContent className="p-6 relative z-10">
                                <div className="flex items-center justify-between">
                                    <p className="text-small font-medium text-slate-500 dark:text-slate-400">Supplied USDC</p>
                                    <div className="rounded-full bg-green-500/10 p-2 text-green-500 dark:bg-green-500/20 dark:text-green-400">
                                        <ArrowUpRight className="size-4" />
                                    </div>
                                </div>
                                <div className="mt-4 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                                    <span className="min-w-0 max-w-full break-all text-2xl font-bold leading-tight text-slate-900 dark:text-white">{!isConnected ? "—" : loading ? "Loading..." : suppliedBalance === null ? "Unavailable" : formatUsdc(suppliedBalance)}</span>
                                    <span className="shrink-0 text-small font-medium text-slate-500">USDC</span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">Current value of LendingPool shares</p>
                            </CardContent>
                        </Card>

                        <Card className="glass-card flex flex-col justify-between overflow-hidden border-primary-500/20 bg-primary-500/5">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <p className="text-small font-bold tracking-wider text-primary-600 dark:text-primary-400 uppercase">Borrowed Amount</p>
                                    <ArrowDownRight className="size-4 text-primary-500" />
                                </div>
                                <div className="mt-4 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                                    <span className="min-w-0 max-w-full break-all text-2xl font-bold leading-tight text-slate-900 dark:text-white">{!isConnected ? "—" : loading ? "Loading..." : readError ? "Unavailable" : formatUsdc(totalBorrowed)}</span>
                                    <span className="shrink-0 text-small font-medium text-slate-500">USDC</span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">Across {activeBorrowedLoans.length} active borrowed loan(s)</p>
                            </CardContent>
                        </Card>

                        <Card className="glass-card flex flex-col justify-between overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <p className="text-small font-medium text-slate-500 dark:text-slate-400">Active Loans</p>
                                    <Activity className="size-4 text-primary-500" />
                                </div>
                                <p className="mt-4 text-h3 font-bold text-slate-900 dark:text-white">{!isConnected ? "—" : loading ? "Loading..." : readError ? "Unavailable" : activeLoanCount}</p>
                                <p className="mt-1 text-xs text-slate-500">Borrowed and funded active loans</p>
                            </CardContent>
                        </Card>

                        <Card className="glass-card flex flex-col justify-between overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <p className="text-small font-medium text-slate-500 dark:text-slate-400">Credit Score</p>
                                    <ShieldCheck className="size-4 text-primary-500" />
                                </div>
                                <p className="mt-4 text-h3 font-bold text-slate-900 dark:text-white">{!isConnected ? "—" : loading ? "Loading..." : creditScore ?? "Unavailable"}</p>
                                <p className="mt-1 text-xs text-slate-500">On-chain score</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Main Lists */}
                    <div className="mt-8 grid gap-8 lg:grid-cols-2">

                        {/* Borrowed List */}
                        <motion.div variants={itemVariants} className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                <Briefcase className="size-5 text-primary-500" />
                                <h3 className="text-h4 font-bold">My Borrows</h3>
                            </div>

                            {loading ? (
                                <div className="glass-card flex h-48 items-center justify-center rounded-2xl">
                                    <div className="size-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                                </div>
                            ) : !isConnected ? (
                                <p className="py-8 text-center text-small text-slate-500">Connect your wallet to view borrowed loans.</p>
                            ) : readError ? (
                                <p className="py-8 text-center text-small text-amber-700 dark:text-amber-300">Borrowed loan records are unavailable.</p>
                            ) : borrowedLoans.length === 0 ? (
                                <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                                    <p className="text-small text-slate-500">No loan records as borrower.</p>
                                    <Link href="/loans/create" className="mt-2 text-small font-medium text-primary-500 hover:text-primary-600">
                                        Create a request &rarr;
                                    </Link>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {borrowedLoans.map((loan) => (
                                        <Link key={loan.id} href={`/loans/${loan.id}`}>
                                            <Card className="glass-card transition-all hover:scale-[1.02] hover:shadow-glow-primary/20">
                                                <CardContent className="flex items-center justify-between p-4">
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">{formatUsdc(loan.principal)} USDC</p>
                                                        <p className="text-xs text-slate-500">Status: <span className="font-medium text-primary-500">{loan.status}</span></p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-small font-medium text-slate-600 dark:text-slate-300">{loan.interestRate}% APY</p>
                                                        <p className="text-xs text-slate-500">{loan.duration} Days</p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </motion.div>

                        {/* Funded List */}
                        <motion.div variants={itemVariants} className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                <LineChart className="size-5 text-accent-500" />
                                <h3 className="text-h4 font-bold">Funded Assets</h3>
                            </div>

                            {loading ? (
                                <div className="glass-card flex h-48 items-center justify-center rounded-2xl">
                                    <div className="size-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                                </div>
                            ) : !isConnected ? (
                                <p className="py-8 text-center text-small text-slate-500">Connect your wallet to view funded loans.</p>
                            ) : readError ? (
                                <p className="py-8 text-center text-small text-amber-700 dark:text-amber-300">Funded loan records are unavailable.</p>
                            ) : fundedLoans.length === 0 ? (
                                <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                                    <p className="text-small text-slate-500">No loan funding records for this wallet.</p>
                                    <Link href="/loans" className="mt-2 text-small font-medium text-accent-500 hover:text-accent-600">
                                        Browse marketplace &rarr;
                                    </Link>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {fundedLoans.map((loan) => (
                                        <Link key={loan.id} href={`/loans/${loan.id}`}>
                                            <Card className="glass-card transition-all hover:scale-[1.02] hover:shadow-glow-accent/20">
                                                <CardContent className="flex items-center justify-between p-4">
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">{formatUsdc(loan.principal)} USDC</p>
                                                        <p className="text-xs text-slate-500">Status: <span className="font-medium text-accent-500">{loan.status}</span></p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-small font-medium text-green-500 dark:text-green-400">+{loan.interestRate}% APY</p>
                                                        <p className="text-xs text-slate-500">{loan.duration} Days</p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
