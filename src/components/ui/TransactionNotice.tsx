"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { TransactionFeedback } from "@/types/loan";

export function TransactionNotice({ transaction }: { transaction: TransactionFeedback }) {
  if (transaction.status === "idle") return null;

  const Icon = transaction.status === "pending"
    ? Loader2
    : transaction.status === "success"
      ? CheckCircle2
      : AlertCircle;
  const tone = transaction.status === "failed"
    ? "border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300"
    : transaction.status === "success"
      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
      : "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300";

  return (
    <div role="status" aria-live="polite" className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm ${tone}`}>
      <Icon className={`size-4 shrink-0 ${transaction.status === "pending" ? "animate-spin" : ""}`} />
      <span>{transaction.message}</span>
      {transaction.explorerUrl && transaction.hash && (
        <a href={transaction.explorerUrl} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">
          View on Arc Explorer
        </a>
      )}
    </div>
  );
}