"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
    LayoutDashboard,
    Store,
    Briefcase,
    ShieldCheck,
    History,
    TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Marketplace", href: "/loans", icon: Store },
    { name: "Lend & Earn", href: "/earn", icon: TrendingUp },
    { name: "Portfolio", href: "/portfolio", icon: Briefcase },
    { name: "Reputation", href: "/reputation", icon: ShieldCheck },
    { name: "History", href: "/history", icon: History },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border/50 bg-surface/80 px-4 py-8 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[hsl(222,47%,4%)]/80 lg:flex">
            {/* Brand */}
            <div className="mb-10 px-2">
                <Link
                    href="/"
                    className="text-h3 font-extrabold tracking-tight text-gray-900 transition-all hover:opacity-80 dark:text-white"
                >
                    Cred
                    <span
                        className="bg-clip-text text-transparent"
                        style={{ backgroundImage: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}
                    >
                        Trust
                    </span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex flex-1 flex-col gap-2">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-small font-semibold transition-all duration-300",
                                isActive
                                    ? "text-primary-600 dark:text-primary-400"
                                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-active-pill"
                                    className="absolute inset-0 rounded-xl bg-primary-50 dark:bg-primary-500/10"
                                    initial={false}
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}

                            <Icon
                                className={cn(
                                    "relative z-10 size-5 transition-transform duration-300",
                                    isActive ? "text-primary-500" : "text-inherit group-hover:scale-110"
                                )}
                            />
                            <span className="relative z-10">{item.name}</span>

                            {/* Active Indicator Line */}
                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-active-indicator"
                                    className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary-500 shadow-[0_0_12px_rgba(var(--primary),0.8)]"
                                    initial={false}
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer Area / User Status could go here if needed, but currently in Header */}
            <div className="mt-auto rounded-xl border border-primary-500/10 bg-primary-500/5 p-4 text-center">
                <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-primary-500/20">
                    <ShieldCheck className="size-5 text-primary-500" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                    Arc Mainnet
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Secured Network
                </p>
            </div>
        </aside>
    );
}
