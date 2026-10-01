"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Info, TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useLoans } from "@/hooks/useLoans";
import { useWallet } from "@/contexts/WalletContext";

export function CreditScoreCard() {
    const { address } = useWallet();
    const { fetchCreditScore } = useLoans();
    const [score, setScore] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        if (address) {
            setLoading(true);
            setScore(null);
            fetchCreditScore(address)
                .then(s => {
                    if (mounted) setScore(s);
                })
                .finally(() => {
                    if (mounted) setLoading(false);
                });
        } else {
            setScore(null);
            setLoading(false);
        }
        return () => { mounted = false; };
    }, [address, fetchCreditScore]);

    const getScoreInfo = (s: number) => {
        if (s >= 800) return { label: "Excellent", color: "text-green-600", bg: "bg-green-50", border: "border-green-100" };
        if (s >= 650) return { label: "Good", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" };
        if (s >= 500) return { label: "Fair", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-100" };
        return { label: "Poor", color: "text-red-600", bg: "bg-red-50", border: "border-red-100" };
    };

    const info = score !== null ? getScoreInfo(score) : null;

    return (
        <Card variant="elevated" className="overflow-hidden">
            <CardHeader className="border-b border-gray-50 dark:border-gray-800 pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-small font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                        Reputation Score
                    </CardTitle>
                    <ShieldCheck className="size-5 text-primary-600 dark:text-primary-400" />
                </div>
            </CardHeader>
            <CardContent className="pt-8">
                {loading ? (
                    <div className="flex animate-pulse flex-col items-center gap-4 py-4">
                        <div className="h-16 w-16 rounded-full bg-gray-200" />
                        <div className="h-4 w-24 rounded bg-gray-200" />
                    </div>
                ) : score !== null ? (
                    <div className="flex flex-col items-center text-center">
                        <div className="relative mb-6">
                            {/* Score Circle */}
                            <div className="flex h-32 w-32 items-center justify-center rounded-full border-8 border-gray-100 dark:border-gray-800">
                                <div
                                    className="absolute inset-0 rounded-full border-8 border-primary-600 dark:border-primary-500 transition-all duration-1000 ease-out"
                                    style={{
                                        clipPath: `polygon(50% 50%, -50% -50%, ${score / 10}% -50%)`, // Simple clip path for demonstration
                                        transform: `rotate(${(score / 1000) * 360}deg)`
                                    }}
                                />
                                <span className="text-h1 font-bold text-gray-900 dark:text-white">{score}</span>
                            </div>
                            <div className={`absolute -bottom-2 translate-x-1/2 right-1/2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-tighter shadow-sm border ${info?.bg} dark:bg-gray-800 ${info?.color} ${info?.border} dark:border-gray-700`}>
                                {info?.label}
                            </div>
                        </div>

                        <p className="text-small text-gray-500 dark:text-gray-400 leading-relaxed max-w-[200px]">
                            Your score is based on <strong>on-chain history</strong> and successful repayments.
                        </p>

                        <div className="mt-8 grid w-full grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-800 pt-6 text-left">
                            <div>
                                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                    <TrendingUp className="size-3" />
                                    Trend
                                </div>
                                <p className="text-small font-medium text-green-600 dark:text-green-400">+12 pts</p>
                            </div>
                            <div>
                                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                    <AlertCircle className="size-3" />
                                    Next Update
                                </div>
                                <p className="text-small font-medium text-gray-900 dark:text-white">After repayment</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-8 text-center text-gray-400">
                        <Info className="mx-auto mb-2 size-8 opacity-20" />
                        <p className="text-small">Connect wallet to view your score</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
