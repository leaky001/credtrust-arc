"use client";

/**
 * WalletContext.tsx
 *
 * Multi-wallet connection context for CredTrust Arc.
 *
 * Key behaviours:
 *  - connect() / switchWallet() open the wallet-picker modal — they do NOT
 *    directly call eth_requestAccounts on a random provider.
 *  - The user picks a specific wallet (MetaMask, Phantom, Coinbase, etc.) and
 *    we connect to that provider only.
 *  - disconnect() clears all React state AND sets a localStorage flag so that
 *    auto-reconnect is suppressed across page reloads.
 *  - On page load we only auto-reconnect if the user has NOT explicitly
 *    disconnected (flag absent). We use eth_accounts (no popup) on the
 *    previously selected provider only.
 *  - accountsChanged and chainChanged events are scoped to the active provider.
 *
 * Nothing here touches smart contracts, Arc config, or .env.local.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BrowserProvider, type JsonRpcSigner } from "ethers";
import {
  detectEVMProviders,
  hasAnyEVMProvider,
  type WalletProviderInfo,
} from "@/lib/walletProviders";
import { ARC_CHAIN_ID, ARC_RPC_URL, ARC_EXPLORER_URL } from "@/lib/contracts/config";

// ── Storage key ────────────────────────────────────────────────────────────

/**
 * We use localStorage (survives page reload) rather than sessionStorage.
 * When the user clicks Disconnect we set this flag so the next page load
 * stays disconnected. Clicking Connect Wallet clears it.
 */
const DISCONNECTED_KEY = "credtrust_disconnected";
/**
 * Remembers which wallet provider was last connected so we can auto-reconnect
 * the correct provider (not just window.ethereum).
 * Value: one of "metamask" | "phantom" | "coinbase" | "generic"
 */
const LAST_WALLET_KEY = "credtrust_last_wallet";

// ── Types ──────────────────────────────────────────────────────────────────

type WalletContextValue = {
  address: string | null;
  signer: JsonRpcSigner | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectingName: string | null;   // name of wallet currently being approved
  error: string | null;
  hasWallet: boolean;
  pickerOpen: boolean;
  /** Opens the wallet-picker modal (used by Connect Wallet & Switch Wallet) */
  openPicker: () => void;
  /** Closes the picker without connecting */
  closePicker: () => void;
  /** Called by the picker when the user selects a provider */
  connectProvider: (info: WalletProviderInfo) => Promise<void>;
  /** Disconnects the app session — does NOT call wallet.disconnect() */
  disconnect: () => void;
  switchNetwork: (chainId: string) => Promise<void>;
  /** Legacy alias kept for any callers that still use connect() */
  connect: () => void;
  /** Legacy alias kept for any callers that still use switchWallet() */
  switchWallet: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

// ── Helpers ────────────────────────────────────────────────────────────────

function isDisconnected(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DISCONNECTED_KEY) === "true";
}

function markDisconnected() {
  if (typeof window === "undefined") return;
  localStorage.setItem(DISCONNECTED_KEY, "true");
  localStorage.removeItem(LAST_WALLET_KEY);
}

function clearDisconnected(walletIcon: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DISCONNECTED_KEY);
  localStorage.setItem(LAST_WALLET_KEY, walletIcon);
}

function getLastWalletIcon(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_WALLET_KEY);
}

// ── Provider ───────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingName, setConnectingName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasWallet, setHasWallet] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // The currently active EVM provider (set on successful connection)
  const activeProvider = useRef<any>(null);

  // ── Detect wallets on mount ──────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;
    let attempts = 0;
    const maxAttempts = 8;

    const check = () => {
      attempts += 1;
      if (hasAnyEVMProvider()) {
        if (mounted) setHasWallet(true);
        return;
      }
      if (attempts < maxAttempts && mounted) {
        setTimeout(check, 500);
      } else if (mounted) {
        setHasWallet(false);
      }
    };

    check();
    return () => { mounted = false; };
  }, []);

  // ── Auto-reconnect on page load ──────────────────────────────────────────
  // Only runs when: (a) user has NOT explicitly disconnected, AND
  // (b) we can find the same wallet provider they used before.

  useEffect(() => {
    if (isDisconnected()) return;

    const lastIcon = getLastWalletIcon();
    if (!lastIcon) return;

    let cancelled = false;

    const tryReconnect = async () => {
      // Re-detect to get fresh provider references
      const providers = detectEVMProviders();
      if (!providers.length) return;

      // Find the matching provider from last session
      const match = providers.find((p) => p.icon === lastIcon) ?? providers[0];
      if (!match) return;

      try {
        const accounts = (await match.provider.request({
          method: "eth_accounts",
        })) as string[];

        if (cancelled || !accounts?.[0]) return;

        const chainIdHex = await match.provider.request({ method: "eth_chainId" });
        if (parseInt(chainIdHex, 16) !== ARC_CHAIN_ID) {
            // Wait for user interaction to switch network, don't auto-switch silently
            return;
        }

        const browserProvider = new BrowserProvider(match.provider);
        const signerInstance = await browserProvider.getSigner();

        if (cancelled) return;

        activeProvider.current = match.provider;
        setAddress(accounts[0]);
        setSigner(signerInstance);
      } catch {
        // Silent — user simply isn't authorized on this provider yet
      }
    };

    // Give extensions 600 ms to inject before trying
    const timer = setTimeout(tryReconnect, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // ── Event listeners on the active provider ────────────────────────────────

  useEffect(() => {
    const provider = activeProvider.current;
    if (!provider?.on) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (!accounts || accounts.length === 0) {
        // Wallet locked or account removed — treat as disconnect
        markDisconnected();
        activeProvider.current = null;
        setAddress(null);
        setSigner(null);
        setError(null);
      } else {
        // Account switched inside the same wallet — update
        setAddress(accounts[0]);
        try {
          const bp = new BrowserProvider(provider);
          const s = await bp.getSigner();
          setSigner(s);
        } catch {
          setSigner(null);
        }
      }
    };

    const handleChainChanged = () => {
      // Reload to avoid stale contract state — same as before
      window.location.reload();
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [address]); // re-bind when address changes (covers signer recreation)

  // ── Picker controls ───────────────────────────────────────────────────────

  const openPicker = useCallback(() => {
    setError(null);
    setPickerOpen(true);
  }, []);

  const closePicker = useCallback(() => {
    if (!isConnecting) setPickerOpen(false);
  }, [isConnecting]);

  // ── Connect to a specific provider ────────────────────────────────────────

  const connectProvider = useCallback(async (info: WalletProviderInfo) => {
    setError(null);
    setIsConnecting(true);
    setConnectingName(info.name);

    try {
      const accounts = (await info.provider.request({
        method: "eth_requestAccounts",
      })) as string[] | undefined;

      if (!accounts?.[0]) {
        setError("No accounts returned. Unlock your wallet and try again.");
        return;
      }
      
      // Ensure we are on Arc Mainnet
      const chainIdHex = await info.provider.request({ method: "eth_chainId" });
      const targetChainHex = `0x${ARC_CHAIN_ID.toString(16)}`;
      
      if (parseInt(chainIdHex, 16) !== ARC_CHAIN_ID) {
          try {
            await info.provider.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: targetChainHex }],
            });
          } catch (switchError: any) {
            if (switchError.code === 4902) {
              try {
                await info.provider.request({
                  method: "wallet_addEthereumChain",
                  params: [
                    {
                      chainId: targetChainHex,
                      chainName: "Arc Mainnet",
                      rpcUrls: [ARC_RPC_URL],
                      blockExplorerUrls: [ARC_EXPLORER_URL],
                      nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
                    },
                  ],
                });
              } catch (addError) {
                setError("Failed to add Arc Mainnet to wallet.");
                return;
              }
            } else {
              setError("Failed to switch to Arc Mainnet.");
              return;
            }
          }
          
          // Verify it switched successfully
          const newChainIdHex = await info.provider.request({ method: "eth_chainId" });
          if (parseInt(newChainIdHex, 16) !== ARC_CHAIN_ID) {
              setError("Wallet is not on Arc Mainnet.");
              return;
          }
      }

      const browserProvider = new BrowserProvider(info.provider);
      const signerInstance = await browserProvider.getSigner();

      activeProvider.current = info.provider;
      clearDisconnected(info.icon);

      setAddress(accounts[0]);
      setSigner(signerInstance);
      setPickerOpen(false);
    } catch (err: any) {
      const raw: string = err?.message ?? String(err);

      if (err?.code === -32002) {
        setError(
          "A connection request is already pending. Check your " +
            info.name +
            " extension."
        );
      } else if (
        raw.toLowerCase().includes("reject") ||
        raw.toLowerCase().includes("denied") ||
        err?.code === 4001
      ) {
        setError("Connection cancelled. Select a wallet to try again.");
      } else if (err?.code === -32603) {
        setError(
          "Internal wallet error. Make sure " +
            info.name +
            " is connected to Arc Mainnet."
        );
      } else {
        setError(raw.slice(0, 120));
      }
    } finally {
      setIsConnecting(false);
      setConnectingName(null);
    }
  }, []);

  // ── Disconnect ────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    // Remove listeners from the current provider before releasing it
    const provider = activeProvider.current;
    if (provider?.removeAllListeners) {
      try { provider.removeAllListeners(); } catch { /* ignore */ }
    }

    markDisconnected();
    activeProvider.current = null;

    setAddress(null);
    setSigner(null);
    setError(null);
    setPickerOpen(false);
  }, []);

  // ── Network switch ────────────────────────────────────────────────────────

  const switchNetwork = useCallback(async (chainId: string) => {
    const provider = activeProvider.current;
    if (!provider) throw new Error("No wallet connected");

    const hexChainId = `0x${Number(chainId).toString(16)}`;
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: hexChainId,
                chainName: chainId === "31337" ? "Hardhat Local" : "Arc Mainnet",
                rpcUrls:
                  chainId === "31337"
                    ? ["http://127.0.0.1:8545"]
                    : ["https://rpc.mainnet.arc.io"],
                blockExplorerUrls:
                  chainId === "31337" ? undefined : ["https://explorer.arc.io"],
                nativeCurrency:
                  chainId === "31337"
                    ? { name: "Ether", symbol: "ETH", decimals: 18 }
                    : { name: "USD Coin", symbol: "USDC", decimals: 6 },
              },
            ],
          });
        } catch {
          throw new Error("Failed to add network to wallet");
        }
      } else {
        throw new Error(switchError.message || "Failed to switch network");
      }
    }
  }, []);

  // ── Legacy aliases (kept for existing callers) ────────────────────────────

  /** connect() now opens the picker instead of directly connecting */
  const connect = useCallback(() => { openPicker(); }, [openPicker]);

  /** switchWallet() opens the picker to let the user pick a different wallet */
  const switchWallet = useCallback(() => { openPicker(); }, [openPicker]);

  // ── Context value ─────────────────────────────────────────────────────────

  const value: WalletContextValue = {
    address,
    signer,
    isConnected: !!address,
    isConnecting,
    connectingName,
    error,
    hasWallet,
    pickerOpen,
    openPicker,
    closePicker,
    connectProvider,
    disconnect,
    switchNetwork,
    connect,
    switchWallet,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
