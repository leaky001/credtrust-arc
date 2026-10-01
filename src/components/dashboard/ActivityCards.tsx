"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useLoans } from "@/hooks/useLoans";
import { useWallet } from "@/contexts/WalletContext";
import { formatUsdc } from "@/lib/usdc";

export function LendingActivityCard() {
    const { address } = useWallet();
    const { fetchLoans } = useLoans();
    const [totalFunded, setTotalFunded] = useState<bigint>(BigInt(0));
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        if (address) {
            setLoading(true);
            setTotalFunded(BigInt(0));
            fetchLoans()
                .then(loans => {
                    if (!mounted) return;
                    const funded = loans
                        .filter(l => l.lender?.toLowerCase() === address.toLowerCase())
                        .reduce((acc, l) => acc + BigInt(l.principal), BigInt(0));
                    setTotalFunded(funded);
                    setLoading(false);
                })
                .catch(() => {
                    if (mounted) setLoading(false);
                });
        } else {
            setTotalFunded(BigInt(0));
            setLoading(false);
        }
        return () => { mounted = false; };
    }, [address, fetchLoans]);

    return (
        <Card variant="elevated" className="glass-card">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="size-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-600 dark:text-primary-400">
                        <TrendingUp className="size-5" />
                    </div>
                    <span className="text-[10px] font-bold text-primary-700 dark:text-primary-300 bg-primary-500/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {address ? "Active" : "Disconnected"}
                    </span>
                </div>
                <div className="mt-4">
                    <p className="text-small font-medium text-brand-muted">Total Invested</p>
                    <div className="mt-1 flex items-baseline gap-1">
                        <h3 className="text-h3 font-bold text-brand-text dark:text-white">
                            {loading ? "..." : formatUsdc(totalFunded)}
                        </h3>
                        <span className="text-xs font-semibold text-brand-muted">USDC</span>
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 font-medium">
                    <ArrowUpRight className="size-3" />
                    <span>{address ? "Yield tracking enabled" : "Connect wallet to view"}</span>
                </div>
            </CardContent>
        </Card>
    );
}

export function BorrowingActivityCard() {
    const { address } = useWallet();
    const { fetchLoans } = useLoans();
    const [totalBorrowed, setTotalBorrowed] = useState<bigint>(BigInt(0));
    const [activeCount, setActiveCount] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        if (address) {
            setLoading(true);
            setTotalBorrowed(BigInt(0));
            setActiveCount(0);
            fetchLoans()
                .then(loans => {
                    if (!mounted) return;
                    const borrowing = loans.filter(l => l.borrower.toLowerCase() === address.toLowerCase());
                    const total = borrowing.reduce((acc, l) => acc + BigInt(l.principal), BigInt(0));
                    setTotalBorrowed(total);
                    setActiveCount(borrowing.filter(l => l.status === "Active").length);
                    setLoading(false);
                })
                .catch(() => {
                    if (mounted) setLoading(false);
                });
        } else {
            setTotalBorrowed(BigInt(0));
            setActiveCount(0);
            setLoading(false);
        }
        return () => { mounted = false; };
    }, [address, fetchLoans]);

    return (
        <Card variant="elevated" className="glass-card">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="size-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-600 dark:text-primary-400">
                        <Wallet className="size-5" />
                    </div>
                    <span className="text-[10px] font-bold text-primary-700 dark:text-primary-300 bg-primary-500/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {address ? `${activeCount} Active` : "Disconnected"}
                    </span>
                </div>
                <div className="mt-4">
                    <p className="text-small font-medium text-brand-muted">Total Borrowed</p>
                    <div className="mt-1 flex items-baseline gap-1">
                        <h3 className="text-h3 font-bold text-brand-text dark:text-white">
                            {loading ? "..." : formatUsdc(totalBorrowed)}
                        </h3>
                        <span className="text-xs font-semibold text-brand-muted">USDC</span>
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 font-medium">
                    <ArrowDownRight className="size-3" />
                    <span>{address ? "Dynamic repayment terms" : "Connect wallet to view"}</span>
                </div>
            </CardContent>
        </Card>
    );
}
