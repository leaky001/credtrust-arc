"use client";

import Link from "next/link";
import { Plus, ArrowRight, LayoutGrid, Filter, Search } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoansList } from "./LoansList";

const containerVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 }
};

export default function LoansPage() {
  return (
    <div className="relative isolate min-h-screen bg-transparent pb-24">
      {/* Background Decorative Glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] size-[40%] rounded-full bg-primary-500/10 blur-[120px]" />
        <div className="absolute top-[20%] -right-[5%] size-[30%] rounded-full bg-accent-500/5 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-container-xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="flex flex-col gap-8"
        >
          {/* Header Section */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-500">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500"></span>
                </span>
                Active Marketplace
              </div>
              <h1 className="text-h2 font-bold tracking-tight text-slate-900 dark:text-white lg:text-h1">
                Reputation <span className="text-gradient-primary">Lattice</span>
              </h1>
              <p className="max-w-2xl text-body-lg text-slate-600 dark:text-slate-400">
                Unlock peer-to-peer liquidity backed by verifiable trust scores.
                Fund requests to earn yield or initialize your own credit line.
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
              <Link href="/loans/create">
                <Button
                  variant="primary"
                  size="lg"
                  className="px-8 shadow-lg shadow-primary-500/20 glow-primary"
                  leftIcon={<Plus className="size-5" />}
                >
                  New Request
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Controls Bar */}
          <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-small font-bold uppercase tracking-widest">
              <LayoutGrid className="size-4" />
              Open Market
            </div>

            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search className="size-4 text-slate-500 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Filter by amount..."
                  className="h-10 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 pl-10 pr-4 text-small transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:text-white"
                />
              </div>
              <Button variant="secondary" size="sm" className="h-10 bg-white/50 dark:bg-white/5 border-slate-200 dark:border-slate-800">
                <Filter className="size-4 mr-2" />
                Sort
              </Button>
            </div>
          </motion.div>

          {/* Main List Area */}
          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden border-none bg-transparent shadow-none">
              <CardContent className="p-0">
                <LoansList />
              </CardContent>
            </Card>
          </motion.div>

          {/* Footer Info */}
          <motion.div
            variants={itemVariants}
            className="mt-12 rounded-3xl border border-primary-500/10 bg-primary-500/[0.02] p-8 text-center"
          >
            <h3 className="text-h4 font-bold text-slate-900 dark:text-white">How Liquidity Flows</h3>
            <p className="mx-auto mt-2 max-w-lg text-small text-slate-500 dark:text-slate-400">
              Transactions are settled in USDC on Arc Mainnet. Collateral is reputation-weighted,
              ensuring that borrowers with high trust scores access the best rates.
            </p>
            <Link href="/docs" className="mt-4 inline-flex items-center gap-2 text-small font-bold text-primary-500 hover:text-primary-400 transition-colors">
              Read Protocol Docs <ArrowRight className="size-4" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
