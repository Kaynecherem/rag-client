"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import NotificationBanner from "@/components/NotificationBanner";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import { Search, History, LogOut } from "lucide-react";

const navItems = [
  { href: "/policyholder", label: "Ask Questions", icon: Search },
  { href: "/policyholder/history", label: "My History", icon: History },
];

export default function PolicyholderLayout({ children }: { children: React.ReactNode }) {
  const { isPolicyholder, isAuthenticated, logout, policyNumber, hydrated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && (!isAuthenticated || !isPolicyholder)) {
      router.replace("/auth");
    }
  }, [hydrated, isAuthenticated, isPolicyholder, router]);

  const handleSignOut = () => {
    localStorage.removeItem("impersonator");
    logout();
    router.replace("/auth");
  };

  if (!hydrated || !isPolicyholder) {
    return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
    );
  }

  return (
      <div className="min-h-screen flex flex-col bg-[#FAF8F4]">
        {/* Impersonation Banner — shown when viewing as superadmin */}
        <ImpersonationBanner />

        {/* Header */}
        <header className="bg-white border-b border-[#E9EAEA] sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-3 sm:px-4 flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/patch-premium-finance-logo.svg" alt="Patch Premium Finance" style={{ height: '48px', width: 'auto' }} />
              <div className="hidden sm:block border-l border-[#E9EAEA] pl-3">
                <div className="font-medium text-sm text-[#1A1A1A]">Policy assistant</div>
                <div className="text-xs text-[#656B6B]">Policy: {policyNumber}</div>
              </div>
            </div>

            {/* Nav Links */}
            <nav className="flex items-center gap-1">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                    <Link
                        key={href}
                        href={href}
                        className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm transition ${
                            active
                                ? "bg-[#F1F1F1] text-[#1A1A1A] font-medium"
                                : "text-[#656B6B] hover:bg-[#F1F1F1] hover:text-[#1A1A1A]"
                        }`}
                    >
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline">{label}</span>
                      <span className="xs:hidden">{label.split(" ").pop()}</span>
                    </Link>
                );
              })}
            </nav>

            {/* Sign Out */}
            <button
                onClick={handleSignOut}
                className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-[#656B6B] hover:text-[#1A1A1A] transition"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-3 sm:px-4 pt-4">
            <NotificationBanner />
          </div>
          {children}
        </main>
      </div>
  );
}