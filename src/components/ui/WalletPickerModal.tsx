"use client";

import { useEffect, useRef, useState } from "react";
import { X, Wallet, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { type WalletProviderInfo } from "@/lib/walletProviders";
import { cn } from "@/lib/utils";

// ── Wallet icons (inline SVG — no extra deps) ──────────────────────────────

function MetaMaskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#F6851B" fillOpacity="0.12" />
      <g transform="translate(5,4) scale(0.75)">
        <path d="M37.5 1L22.1 12.4l2.8-6.6L37.5 1z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2.5 1l15.3 11.5-2.7-6.7L2.5 1z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M32.1 28.2l-4.1 6.3 8.8 2.4 2.5-8.6-7.2-.1z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M0.7 28.3l2.5 8.6 8.8-2.4-4.1-6.3-7.2.1z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M11.5 18.8l-2.4 3.6 8.5.4-.3-9.1-5.8 5.1z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M28.5 18.8l-5.9-5.2-.2 9.2 8.5-.4-2.4-3.6z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 34.5l5.1-2.5-4.4-3.4-.7 5.9z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22.9 32l5.1 2.5-.7-5.9-4.4 3.4z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
    </svg>
  );
}

function PhantomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#AB9FF2" fillOpacity="0.2" />
      <path
        d="M20 8C13.373 8 8 13.373 8 20s5.373 12 12 12 12-5.373 12-12S26.627 8 20 8z"
        fill="#AB9FF2"
      />
      <path
        d="M26.5 18.5c0 1.5-.7 2.8-1.8 3.6-.9.7-2.1 1.1-3.4 1.1h-1.6c-.3 0-.5.2-.5.5v1.8c0 .3-.2.5-.5.5h-2c-.3 0-.5-.2-.5-.5V16c0-.3.2-.5.5-.5h4.6c2.6 0 4.7 1.3 4.7 3z"
        fill="white"
      />
      <circle cx="24" cy="16.5" r="1.5" fill="white" fillOpacity="0.6" />
    </svg>
  );
}

function CoinbaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#1652F0" fillOpacity="0.15" />
      <rect x="8" y="8" width="24" height="24" rx="6" fill="#1652F0" />
      <path
        d="M20 14c-3.314 0-6 2.686-6 6s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm-2 7.5v-3h4v3h-4z"
        fill="white"
      />
    </svg>
  );
}

function GenericWalletIcon({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center justify-center rounded-[10px] bg-gray-200/60 dark:bg-white/10", className)}>
      <Wallet className="size-5 text-gray-500 dark:text-gray-300" />
    </span>
  );
}

function ProviderIcon({ icon, className }: { icon: WalletProviderInfo["icon"]; className?: string }) {
  const cls = cn("size-10 shrink-0", className);
  switch (icon) {
    case "metamask": return <MetaMaskIcon className={cls} />;
    case "phantom":  return <PhantomIcon className={cls} />;
    case "coinbase": return <CoinbaseIcon className={cls} />;
    default:         return <GenericWalletIcon className={cls} />;
  }
}

// ── Modal ─────────────────────────────────────────────────────────────────

type Props = {
  isOpen: boolean;
  providers: WalletProviderInfo[];
  isConnecting: boolean;
  connectingName: string | null;
  error: string | null;
  onSelect: (info: WalletProviderInfo) => void;
  onClose: () => void;
};

export function WalletPickerModal({
  isOpen,
  providers,
  isConnecting,
  connectingName,
  error,
  onSelect,
  onClose,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Animate in
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isConnecting) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, isConnecting, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current && !isConnecting) onClose();
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={cn(
        "fixed inset-0 z-[200] flex items-center justify-center p-4",
        "bg-black/50 backdrop-blur-sm",
        "transition-opacity duration-200",
        mounted ? "opacity-100" : "opacity-0"
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Connect Wallet"
    >
      <div
        className={cn(
          "relative w-full max-w-sm",
          "rounded-2xl border border-border/60 dark:border-white/10",
          "bg-white dark:bg-[#0B1F26]",
          "shadow-2xl shadow-black/20 dark:shadow-black/60",
          "transition-all duration-200",
          mounted ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-2"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/40 dark:border-white/[0.07]">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Connect Wallet</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Choose a wallet to connect
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isConnecting}
            className={cn(
              "rounded-lg p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200",
              "hover:bg-gray-100 dark:hover:bg-white/10 transition-colors",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Provider list */}
        <div className="px-4 py-3 space-y-2">
          {providers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/5">
                <Wallet className="size-7 text-gray-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white text-sm">No wallet detected</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[220px]">
                  Install MetaMask, Phantom, or another EVM wallet extension to continue.
                </p>
              </div>
              <a
                href="https://metamask.io/download"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline mt-1"
              >
                Get MetaMask <ExternalLink className="size-3" />
              </a>
            </div>
          ) : (
            providers.map((info) => {
              const isThisConnecting = isConnecting && connectingName === info.name;
              return (
                <button
                  key={info.name}
                  onClick={() => onSelect(info)}
                  disabled={isConnecting}
                  className={cn(
                    "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left",
                    "border border-transparent",
                    "transition-all duration-150",
                    "hover:border-primary-500/30 hover:bg-primary-500/5 dark:hover:bg-primary-400/[0.07]",
                    "focus:outline-none focus:ring-2 focus:ring-primary-500/40",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    isThisConnecting && "border-primary-500/40 bg-primary-500/8 dark:bg-primary-400/10"
                  )}
                >
                  <ProviderIcon icon={info.icon} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">{info.name}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {isThisConnecting ? "Waiting for approval…" : "Click to connect"}
                    </div>
                  </div>
                  {isThisConnecting ? (
                    <Loader2 className="size-4 text-primary-500 animate-spin shrink-0" />
                  ) : (
                    <div className="size-4 shrink-0 rounded-full border-2 border-gray-200 dark:border-white/10" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-4 mb-3 flex items-start gap-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-4 py-3">
            <AlertCircle className="size-4 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
          </div>
        )}

        {/* Footer note */}
        <div className="px-6 pb-5 pt-1">
          <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center leading-relaxed">
            By connecting you agree to interact with Arc Mainnet smart contracts.
            <br />Your keys never leave your wallet.
          </p>
        </div>
      </div>
    </div>
  );
}
