"use client";

import { usePathname } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isConnected } = useWallet();

  // Hide sidebar on landing page (/)
  const isLandingPage = pathname === "/";
  const showSidebar = !isLandingPage;

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      {showSidebar && <Sidebar />}
      <div
        className={cn(
          "flex min-h-screen flex-col",
          showSidebar && "lg:pl-64"
        )}
      >
        <Header />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
