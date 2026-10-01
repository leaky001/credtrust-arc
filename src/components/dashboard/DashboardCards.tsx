"use client";

import { useEffect, useState, useCallback } from "react";
import { Wallet, PiggyBank, Activity, Coins, Info, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useLoans } from "@/hooks/useLoans";
import { useWallet } from "@/contexts/WalletContext";
import { formatUsdc } from "@/lib/usdc";
import type { Loan } from "@/types/loan";

export function WalletOverviewCards() {
    const { address } = useWallet();
    const { fetchUsdcBalance, fetchPoolStats, fetchLoans } = useLoans();
    
    const [balance, setBalance] = useState<string>("0");
    const [supplied, setSupplied] = useState<string>("0");
    const [activeLoans, setActiveLoans] = useState<number>(0);
    const [recentActivity, setRecentActivity] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!address) {
            setBalance("0");
            setSupplied("0");
            setActiveLoans(0);
            setRecentActivity([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const [bal, stats, loans] = await Promise.all([
                fetchUsdcBalance(address),
                fetchPoolStats(),
                fetchLoans()
            ]);

            setBalance(bal);
            if (stats) {
                setSupplied(stats.userBalance);
            } else {
                setSupplied("0");
            }

            const active = loans.filter(l => 
                (l.borrower.toLowerCase() === address.toLowerCase() || 
                 (l.lender && l.lender.toLowerCase() === address.toLowerCase())) && 
                 l.status === "Active"
            );
            setActiveLoans(active.length);

            const userLoans = loans.filter(l => 
                l.borrower.toLowerCase() === address.toLowerCase() || 
                (l.lender && l.lender.toLowerCase() === address.toLowerCase())
            ).reverse().slice(0, 5); // Latest 5
            setRecentActivity(userLoans);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [address, fetchUsdcBalance, fetchPoolStats, fetchLoans]);

    useEffect(() => {
        let mounted = true;
        loadData().then(() => {
            if (!mounted) return;
        });
        return () => { mounted = false; };
    }, [loadData]);

    return (
        <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-4 sm:grid-cols-2">
                <Card variant="elevated" className="glass-card">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="size-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-600 dark:text-primary-400">
                                <Wallet className="size-5" />
                            </div>
                            <span className="text-[10px] font-bold text-primary-700 dark:text-primary-300 bg-primary-500/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                {address ? "Connected" : "Disconnected"}
                            </span>
                        </div>
                        <div className="mt-4">
                            <p className="text-small font-medium text-brand-muted">Wallet Balance</p>
                            <div className="mt-1 flex items-baseline gap-1">
                                <h3 className="text-h3 font-bold text-brand-text dark:text-white">
                                    {loading ? "..." : formatUsdc(balance)}
                                </h3>
                                <span className="text-xs font-semibold text-brand-muted">USDC</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card variant="elevated" className="glass-card">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="size-10 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-600 dark:text-accent-400">
                                <PiggyBank className="size-5" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <p className="text-small font-medium text-brand-muted">Supplied</p>
                            <div className="mt-1 flex items-baseline gap-1">
                                <h3 className="text-h3 font-bold text-brand-text dark:text-white">
                                    {loading ? "..." : formatUsdc(supplied)}
                                </h3>
                                <span className="text-xs font-semibold text-brand-muted">USDC</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card variant="elevated" className="glass-card">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Activity className="size-5" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <p className="text-small font-medium text-brand-muted">Active Loans</p>
                            <div className="mt-1 flex items-baseline gap-1">
                                <h3 className="text-h3 font-bold text-brand-text dark:text-white">
                                    {loading ? "..." : activeLoans}
                                </h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card variant="elevated" className="glass-card">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <Coins className="size-5" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <p className="text-small font-medium text-brand-muted">Earnings</p>
                            <div className="mt-1 flex items-baseline gap-1">
                                <h3 className="text-small font-bold text-brand-text dark:text-white mt-1">
                                    No earnings yet
                                </h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card variant="elevated" className="glass-card">
                <CardHeader className="border-b border-gray-50 dark:border-gray-800 pb-4">
                    <div className="flex items-center gap-2">
                        <History className="size-5 text-primary-600 dark:text-primary-400" />
                        <CardTitle className="text-small font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                            Recent Activity
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    {loading ? (
                        <div className="text-center text-slate-500 animate-pulse">Loading activity...</div>
                    ) : !address ? (
                         <div className="text-center text-slate-500">Connect wallet to view activity</div>
                    ) : recentActivity.length === 0 ? (
                        <div className="text-center text-slate-500">No recent activity</div>
                    ) : (
                        <div className="space-y-4">
                            {recentActivity.map(loan => (
                                <div key={loan.id} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            {loan.borrower.toLowerCase() === address.toLowerCase() ? "Borrowed" : "Funded"} {formatUsdc(loan.principal)} USDC
                                        </p>
                                        <p className="text-xs text-slate-500">Status: {loan.status}</p>
                                    </div>
                                    <div className="text-xs font-mono text-slate-400">
                                        {loan.id.slice(0, 6)}...{loan.id.slice(-4)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
