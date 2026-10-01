"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useLoans } from "@/hooks/useLoans";
import { Card, CardContent } from "@/components/ui/Card";
import { motion } from "framer-motion";
import { ShieldCheck, Award, Star, TrendingUp, History, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function ReputationPage() {
    const { address, isConnected } = useWallet();
    const { fetchCreditScore } = useLoans();

    const [score, setScore] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        setScore(null);
        const load = async () => {
            if (!isConnected || !address) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const s = await fetchCreditScore(address);
                if (mounted) setScore(s);
            } catch (err) {
                console.error("Failed to load credit score:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [isConnected, address, fetchCreditScore]);

    if (!isConnected) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center p-4 text-center">
                <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-primary-500/10">
                    <ShieldCheck className="size-10 text-primary-500" />
                </div>
                <h2 className="text-h3 font-bold text-gray-900 dark:text-white">Connect Wallet to View Reputation</h2>
                <p className="mt-2 max-w-md text-gray-500 dark:text-gray-400">
                    Your decentralized identity and trust score are tied to your cryptographic wallet.
                </p>
            </div>
        );
    }

    // Derived styling based on score
    const displayScore = score ?? 0;
    const isExcellent = displayScore >= 800;
    const isGood = displayScore >= 600 && displayScore < 800;
    const isFair = displayScore >= 300 && displayScore < 600;

    const tierName = isExcellent ? "Diamond" : isGood ? "Gold" : isFair ? "Silver" : "Bronze";
    const tierColorClass = isExcellent
        ? "text-cyan-500 bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.15)]"
        : isGood
            ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.15)]"
            : isFair
                ? "text-slate-400 bg-slate-400/10 border-slate-400/20 shadow-[0_0_30px_rgba(148,163,184,0.15)]"
                : "text-orange-500 bg-orange-500/10 border-orange-500/20 shadow-[0_0_30px_rgba(249,115,22,0.15)]";

    return (
        <div className="relative isolate min-h-screen bg-transparent pb-24">
            {/* Background Decorative Glow */}
            <div className="absolute inset-x-0 top-0 -z-10 h-[500px] overflow-hidden pointer-events-none focus:outline-none focus:ring-0">
                <div className="absolute left-1/2 top-0 -translate-x-1/2 h-full w-[800px] rounded-full bg-primary-500/5 blur-[120px]" />
            </div>

            <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
                <motion.div initial="hidden" animate="visible" variants={containerVariants} className="flex flex-col gap-8 text-center">

                    <motion.div variants={itemVariants}>
                        <h1 className="text-h2 font-bold tracking-tight text-slate-900 dark:text-white">
                            Trust & <span className="text-gradient-primary">Reputation</span>
                        </h1>
                        <p className="mt-2 text-body text-slate-600 dark:text-slate-400">
                            Your verifiable on-chain identity across the decentralized web.
                        </p>
                    </motion.div>

                    {/* Main Score Card */}
                    <motion.div variants={itemVariants}>
                        <Card className={cn("glass-card relative overflow-hidden transition-all duration-500", tierColorClass)}>
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent dark:from-white/[0.02]" />
                            <CardContent className="relative z-10 p-12 flex flex-col items-center justify-center">
                                <ShieldCheck className="size-16 opacity-80 mb-6" />

                                {loading ? (
                                    <div className="size-16 animate-spin rounded-full border-4 border-current border-t-transparent" />
                                ) : (
                                    <>
                                        <h2 className="text-[5rem] leading-none font-black tracking-tighter">
                                            {displayScore}
                                        </h2>
                                        <p className="mt-4 text-h4 font-bold uppercase tracking-widest">{tierName} Tier</p>
                                        <p className="mt-2 max-w-md text-small opacity-80">
                                            Top 15% of borrowers. You are eligible for the lowest interest rates on the open market.
                                        </p>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Badges Grid */}
                    <motion.div variants={itemVariants} className="text-left mt-8">
                        <h3 className="text-h4 font-bold text-slate-900 dark:text-white mb-4">Earned Badges</h3>
                        <div className="grid gap-4 sm:grid-cols-2">

                            <div className="glass-card flex items-start gap-4 p-4 rounded-2xl relative overflow-hidden group hover:border-primary-500/30 transition-colors">
                                <div className="absolute -inset-2 bg-gradient-to-br from-primary-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="rounded-full bg-primary-500/10 p-3 text-primary-500 shrink-0">
                                    <Award className="size-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        Early Adopter <CheckCircle2 className="size-4 text-primary-500" />
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1">Participated in Genesis block.</p>
                                </div>
                            </div>

                            <div className="glass-card flex items-start gap-4 p-4 rounded-2xl relative overflow-hidden group hover:border-yellow-500/30 transition-colors">
                                <div className="absolute -inset-2 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="rounded-full bg-yellow-500/10 p-3 text-yellow-500 shrink-0">
                                    <Star className="size-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        Perfect Repayment <CheckCircle2 className="size-4 text-yellow-500" />
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1">Never defaulted on a loan.</p>
                                </div>
                            </div>

                        </div>
                    </motion.div>

                </motion.div>
            </div>
        </div>
    );
}
