"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Wallet,
  LogOut,
  ChevronDown,
  Copy,
  Check,
  RefreshCw,
  LayoutDashboard,
  Menu,
  X,
  Store,
  Briefcase,
  ShieldCheck,
  History,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WalletPickerModal } from "@/components/ui/WalletPickerModal";
import { useWallet } from "@/contexts/WalletContext";
import { detectEVMProviders } from "@/lib/walletProviders";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { useState, useRef, useEffect, useMemo } from "react";

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const APP_NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Marketplace", href: "/loans", icon: Store },
  { name: "Lend & Earn", href: "/earn", icon: TrendingUp },
  { name: "Portfolio", href: "/portfolio", icon: Briefcase },
  { name: "Reputation", href: "/reputation", icon: ShieldCheck },
  { name: "History", href: "/history", icon: History },
];

export function Header() {
  const {
    address,
    isConnecting,
    connectingName,
    connect,
    disconnect,
    openPicker,
    closePicker,
    connectProvider,
    pickerOpen,
    error,
  } = useWallet();
  const pathname = usePathname();
  const isLandingPage = pathname === "/";

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Detect available providers for the picker (re-detect each time modal opens)
  const providers = useMemo(() => {
    if (!pickerOpen) return [];
    return detectEVMProviders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Wallet Picker Modal — rendered at header level, portals above everything */}
      <WalletPickerModal
        isOpen={pickerOpen}
        providers={providers}
        isConnecting={isConnecting}
        connectingName={connectingName}
        error={error}
        onSelect={connectProvider}
        onClose={closePicker}
      />

      <header
      className={cn(
        "sticky top-0 z-50",
        "border-b border-border/60 dark:border-white/[0.08]",
        "bg-[#F7F8F5]/90 dark:bg-[#0B1F26]/90",
        "backdrop-blur-xl supports-[backdrop-filter]:bg-[#F7F8F5]/80 dark:supports-[backdrop-filter]:bg-[#0B1F26]/80",
        "transition-colors duration-300"
      )}
    >
      <div className="mx-auto flex h-14 w-full items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 md:px-8">
        {/* Left: Brand Logo & Mobile Toggle */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          {/* Logo: Clickable — returns to /dashboard when connected, / when disconnected */}
          <Link
            href={address ? "/dashboard" : "/"}
            className={cn(
              "shrink-0 text-xl sm:text-2xl font-black tracking-tight text-brand-deep transition-all hover:opacity-85 dark:text-white",
              !isLandingPage && "lg:hidden"
            )}
            title={address ? "Go to Dashboard" : "CredTrust Arc Home"}
          >
            Cred
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #1FA774 0%, #7DE2B1 100%)" }}
            >
              Trust Arc
            </span>
          </Link>
        </div>

        {/* Center: Public Landing Page Navbar (Dashboard is deliberately kept OUT of this menu) */}
        {isLandingPage ? (
          <nav className="hidden lg:flex flex-1 items-center gap-8 pl-8">
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-brand-muted hover:text-brand-text dark:text-gray-300 dark:hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/#how-it-works"
              className="text-sm font-semibold text-brand-muted hover:text-brand-text dark:text-gray-300 dark:hover:text-white transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="/#features"
              className="text-sm font-semibold text-brand-muted hover:text-brand-text dark:text-gray-300 dark:hover:text-white transition-colors"
            >
              Features
            </Link>
            <Link
              href="/reputation"
              className="text-sm font-semibold text-brand-muted hover:text-brand-text dark:text-gray-300 dark:hover:text-white transition-colors"
            >
              Reputation
            </Link>
          </nav>
        ) : (
          <div className="hidden lg:block lg:flex-1" />
        )}

        {/* Right: Controls & Wallet */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Subtle Network pill */}
          <span className="hidden xl:inline-flex items-center gap-1.5 rounded-full border border-primary-500/20 bg-primary-500/5 px-2.5 py-1 text-[11px] font-medium text-primary-700 dark:text-primary-300">
            <span className="size-1.5 rounded-full bg-primary-500" />
            Arc Mainnet • USDC Gas
          </span>

          <ThemeToggle />

          {/* Connected state */}
          {address ? (
            <div className="flex items-center gap-2">
              {/* Tasteful Open App / My Dashboard button on the landing page */}
              {isLandingPage && (
                <Link href="/dashboard" className="hidden sm:inline-flex">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5 rounded-full border-primary-600/30 text-primary-700 hover:bg-primary-500/10 dark:border-primary-400/30 dark:text-primary-300 text-xs font-semibold px-3 py-1.5 shadow-sm"
                  >
                    <LayoutDashboard className="size-3.5" />
                    <span>My Dashboard</span>
                    <ArrowRight className="size-3 opacity-70" />
                  </Button>
                </Link>
              )}

              {/* Wallet Dropdown button */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={cn(
                    "flex items-center gap-2 rounded-full",
                    "border border-border/80 dark:border-white/[0.12]",
                    "bg-white/80 dark:bg-white/5 px-3 py-1.5",
                    "text-xs sm:text-sm font-semibold text-brand-text dark:text-gray-200",
                    "transition-colors hover:bg-surface-secondary dark:hover:bg-white/10"
                  )}
                  title={address}
                >
                  <span className="flex size-2 rounded-full bg-emerald-500" />
                  <Wallet className="size-3.5 text-primary-600 dark:text-primary-400" aria-hidden />
                  <span className="font-mono">{formatAddress(address)}</span>
                  <ChevronDown className="size-3.5 text-brand-muted ml-0.5" />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-border/70 bg-white dark:bg-[#0B1F26] shadow-xl dark:border-white/10 py-1.5 z-50 overflow-hidden text-sm">
                    <div className="px-3.5 py-2 text-xs font-mono text-brand-muted border-b border-border/40 dark:border-white/10 break-all mb-1 bg-surface-secondary/40 dark:bg-white/[0.02]">
                      <span className="text-[10px] uppercase font-bold tracking-wider block text-brand-muted/70 mb-0.5">
                        Connected Account
                      </span>
                      {address.slice(0, 10)}...{address.slice(-8)}
                    </div>

                    {/* 1. My Dashboard */}
                    <Link
                      href="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center w-full px-3.5 py-2 text-brand-text hover:bg-primary-500/10 dark:text-gray-100 dark:hover:bg-white/5 transition-colors font-medium"
                    >
                      <LayoutDashboard className="size-4 mr-2.5 text-primary-600 dark:text-primary-400" />
                      My Dashboard
                    </Link>

                    {/* 2. Copy Address */}
                    <button
                      onClick={handleCopy}
                      className="flex items-center w-full px-3.5 py-2 text-brand-text hover:bg-surface-secondary dark:text-gray-100 dark:hover:bg-white/5 transition-colors font-medium text-left"
                    >
                      {copied ? (
                        <>
                          <Check className="size-4 mr-2.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-600 dark:text-emerald-400">Address Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-4 mr-2.5 text-brand-muted" />
                          Copy Address
                        </>
                      )}
                    </button>

                    {/* 3. Switch Wallet */}
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        openPicker();
                      }}
                      className="flex items-center w-full px-3.5 py-2 text-brand-text hover:bg-surface-secondary dark:text-gray-100 dark:hover:bg-white/5 transition-colors font-medium text-left"
                    >
                      <RefreshCw className="size-4 mr-2.5 text-brand-muted" />
                      Switch Wallet
                    </button>

                    {/* 4. Disconnect */}
                    <button
                      onClick={() => {
                        disconnect();
                        setDropdownOpen(false);
                      }}
                      className="flex items-center w-full px-3.5 py-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors font-medium text-left mt-1 border-t border-border/40 dark:border-white/10"
                    >
                      <LogOut className="size-4 mr-2.5" />
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={openPicker}
                loading={isConnecting}
                leftIcon={<Wallet className="size-3.5" />}
                className="rounded-full px-4 text-xs sm:text-sm font-semibold shadow-md shadow-primary-500/15"
              >
                Connect Wallet
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-border/60 bg-white/95 dark:bg-[#0B1F26]/95 backdrop-blur-xl px-4 py-4 lg:hidden">
          {isLandingPage ? (
            <div className="flex flex-col gap-3">
              <Link
                href="/#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-semibold text-brand-text dark:text-gray-200 hover:bg-surface-secondary dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                How It Works
              </Link>
              <Link
                href="/#features"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-semibold text-brand-text dark:text-gray-200 hover:bg-surface-secondary dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                Features
              </Link>
              <Link
                href="/reputation"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-semibold text-brand-text dark:text-gray-200 hover:bg-surface-secondary dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                Reputation
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-brand-text dark:text-gray-200 hover:bg-surface-secondary dark:hover:bg-white/5 rounded-xl transition-colors mt-1"
              >
                <LayoutDashboard className="size-4" />
                Dashboard
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                Application Navigation
              </div>
              {APP_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                      isActive
                        ? "bg-primary-500/10 text-primary-600 dark:text-primary-400"
                        : "text-gray-600 dark:text-gray-300 hover:bg-surface-secondary dark:hover:bg-white/5"
                    )}
                  >
                    <Icon className="size-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </header>
    </>
  );
}
