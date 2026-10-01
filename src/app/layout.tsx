import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import { Providers } from "./providers";
import { Layout } from "@/components/layout/Layout";
import "./globals.css";

export const metadata: Metadata = {
  title: "CredTrust Arc — Decentralised Credit & Lending on Arc",
  description:
    "CredTrust Arc is a decentralized credit reputation and lending platform built on Arc Mainnet. Borrow and lend USDC using on-chain reputation — no collateral required.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of unstyled dark/light mode */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var saved = localStorage.getItem('theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (saved === 'dark' || (!saved && prefersDark)) {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {}
            `,
          }}
        />
        {/* Suppress third-party wallet extension unhandled errors before Next.js attaches dev overlay */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var isExtError = function(msg) {
                  if (!msg) return false;
                  var lower = String(msg).toLowerCase();
                  return lower.includes('failed to connect to wallet') ||
                         lower.includes('nkbihfbeogaeaoehlefnkodbefgpgknn') ||
                         lower.includes('bfnaelmomeimhlpmgjnjophhpkkoljpa') ||
                         lower.includes('cannot redefine property: ethereum');
                };

                window.addEventListener('unhandledrejection', function(event) {
                  var msg = event.reason && (event.reason.message || String(event.reason));
                  if (isExtError(msg)) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    console.warn("Suppressed internal extension promise rejection:", msg);
                  }
                }, true);

                window.addEventListener('error', function(event) {
                  var msg = event.message || (event.error && (event.error.message || String(event.error)));
                  var filename = event.filename || '';
                  if (isExtError(msg) || isExtError(filename)) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    console.warn("Suppressed internal extension synchronous error:", msg);
                  }
                }, true);
              })();
            `,
          }}
        />
      </head>
      <body>
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  );
}
