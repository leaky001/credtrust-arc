/**
 * walletProviders.ts
 *
 * Detects all available EVM wallet providers injected into the browser.
 * Supports MetaMask, Phantom EVM, Coinbase Wallet, and any generic injected wallet.
 *
 * Rules:
 * - Does NOT touch Solana/non-EVM providers.
 * - Identifies providers by their flags (isMetaMask, isPhantom, isCoinbaseWallet, etc.).
 * - Handles window.ethereum.providers[] (multi-wallet injection).
 * - Does NOT call eth_requestAccounts — purely detection, no side effects.
 */

export type WalletProviderInfo = {
  /** Display name shown in the picker */
  name: string;
  /** Icon identifier for rendering */
  icon: "metamask" | "phantom" | "coinbase" | "generic";
  /** The raw EVM provider object */
  provider: any;
};

/**
 * Returns all detected EVM providers in the browser, deduplicated.
 * Safe to call on every render — no network/RPC calls made.
 */
export function detectEVMProviders(): WalletProviderInfo[] {
  if (typeof window === "undefined") return [];

  const w = window as any;
  const rawEthereum = w.ethereum;

  // Collect all raw providers
  const rawProviders: any[] = [];

  // Check Phantom's separate ethereum property (Phantom injects its own
  // window.phantom.ethereum that is distinct from window.ethereum)
  if (w.phantom?.ethereum && w.phantom.ethereum.isPhantom) {
    rawProviders.push(w.phantom.ethereum);
  }

  if (rawEthereum) {
    // Some browsers expose multiple providers via window.ethereum.providers[]
    if (Array.isArray(rawEthereum.providers) && rawEthereum.providers.length > 0) {
      rawProviders.push(...rawEthereum.providers);
    } else {
      // Single provider
      rawProviders.push(rawEthereum);
    }
  }

  // Deduplicate by object reference so the same provider isn't listed twice
  const seen = new Set<any>();
  const unique: any[] = [];
  for (const p of rawProviders) {
    if (p && !seen.has(p)) {
      seen.add(p);
      unique.push(p);
    }
  }

  // Map to WalletProviderInfo, identifying by flags
  const results: WalletProviderInfo[] = [];

  for (const p of unique) {
    // Phantom EVM: isPhantom is the most reliable flag.
    // Important: check isPhantom BEFORE isMetaMask because Phantom also sets
    // isMetaMask=true on its EVM provider for compatibility.
    if (p.isPhantom) {
      results.push({ name: "Phantom", icon: "phantom", provider: p });
      continue;
    }

    // Coinbase Wallet
    if (p.isCoinbaseWallet || p.isCoinbaseBrowser) {
      results.push({ name: "Coinbase Wallet", icon: "coinbase", provider: p });
      continue;
    }

    // MetaMask (check after Phantom since Phantom mimics isMetaMask)
    if (p.isMetaMask) {
      results.push({ name: "MetaMask", icon: "metamask", provider: p });
      continue;
    }

    // Generic injected wallet (no specific brand flags)
    results.push({ name: "Injected Wallet", icon: "generic", provider: p });
  }

  return results;
}

/**
 * Returns true if any EVM provider is detectable in the browser.
 */
export function hasAnyEVMProvider(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  return !!(w.ethereum || w.phantom?.ethereum);
}
