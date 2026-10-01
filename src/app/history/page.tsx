"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { History as HistoryIcon, Activity, Database, ExternalLink, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useLoans } from "@/hooks/useLoans";
import { useWallet } from "@/contexts/WalletContext";
import { formatUsdc } from "@/lib/usdc";
import { ARC_EXPLORER_URL } from "@/lib/contracts/config";
import type { AccountActivity } from "@/types/loan";

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function HistoryPage() {
  const { address, isConnected, openPicker } = useWallet();
  const { fetchAccountActivity, isConfigured } = useLoans();
  const [activities, setActivities] = useState<AccountActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!isConnected || !address || !isConfigured) {
      setActivities([]);
      setReadError(false);
      setLoading(false);
      return () => { mounted = false; };
    }
    setLoading(true);
    setReadError(false);
    fetchAccountActivity(address)
      .then((data) => {
        if (!mounted) return;
        setActivities(data);
      })
      .catch(() => { if (mounted) setReadError(true); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [address, fetchAccountActivity, isConnected, isConfigured]);

  return (
    <div className="relative isolate min-h-screen pb-24">
      {/* Background Decor */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 size-[40%] rounded-full bg-indigo-500/5 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-container-xl px-4 py-12 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-12"
        >
          {/* Header */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/50 dark:border-slate-800/50 bg-slate-500/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              <HistoryIcon className="size-3.5" />
              Account Activity
            </div>
            <h1 className="text-h2 font-bold tracking-tight text-slate-900 dark:text-white lg:text-h1">
              Transaction History
            </h1>
            <p className="max-w-2xl text-body-lg text-slate-600 dark:text-slate-400">
              Events emitted by the existing loan and lending-pool contracts for your connected wallet.
            </p>
            <p className="max-w-2xl text-xs text-slate-500 dark:text-slate-400">
              Shows contract-emitted creation, funding, repayment, default, deposit, and withdrawal events. This is not a complete USDC transfer history.
            </p>
            <p className="max-w-2xl text-xs text-slate-500 dark:text-slate-400">
              This view is not a full transaction log. Deposit/withdrawal events and exact creation, funding, or repayment transaction history are not exposed through the current application history reader; a loan&apos;s funded date and current status are shown when available.
            </p>
            {!isConnected && <div className="mt-5"><Button variant="primary" onClick={openPicker}>Connect Wallet</Button></div>}
          </div>

          <Card className="glass-card shadow-xl border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/50 pb-6">
              <CardTitle className="text-h4 flex items-center gap-2">
                <Database className="size-5 text-primary-500" />
                On-chain Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center text-slate-500">
                  <Activity className="size-8 animate-pulse mx-auto mb-4 text-primary-400" />
                  Syncing on-chain history...
                </div>
              ) : !isConnected ? (
                <div className="p-12 text-center text-slate-500">Connect your wallet to view its loan activity.</div>
              ) : !isConfigured ? (
                <div className="p-12 text-center text-slate-500">Loan contract reads are not configured.</div>
              ) : readError ? (
                <div className="p-12 text-center text-amber-700 dark:text-amber-300">Loan records could not be loaded from Arc RPC. Try again later.</div>
              ) : activities.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Wallet className="mx-auto mb-3 size-7 opacity-50" />
                  No recent activity
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400">
                          <Activity className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white">{activity.kind}</p>
                          <p className="text-xs text-slate-500">
                            {activity.loanAddress ? `Loan ${formatAddress(activity.loanAddress)} · ` : ""}
                            {activity.timestamp ? new Date(activity.timestamp * 1000).toLocaleString() : `Block ${activity.blockNumber}`}
                          </p>
                          <a
                            href={`${ARC_EXPLORER_URL}/tx/${activity.transactionHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] text-primary-600 hover:underline dark:text-primary-400"
                          >
                            {formatAddress(activity.transactionHash)} <ExternalLink className="size-3" />
                          </a>
                        </div>
                      </div>
                      <div className="text-right">
                        {activity.amount && <p className="font-semibold text-slate-900 dark:text-white">{formatUsdc(activity.amount)} USDC</p>}
                        {activity.interest && <p className="text-xs text-slate-500">Interest paid: {formatUsdc(activity.interest)} USDC</p>}
                        {!activity.amount && <p className="text-xs text-slate-500">Amount not included in event</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
