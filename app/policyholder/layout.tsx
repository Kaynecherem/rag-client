"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Impersonation Banner — shown when viewing as superadmin */}
        <ImpersonationBanner />

        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-3 sm:px-4 flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden">
                <Image src="/patch-logo-blue.png" alt="Patch" width={36} height={36} className="w-full h-full object-cover" />
              </div>
              <div className="hidden sm:block">
                <div className="font-semibold text-sm text-gray-900">Policy Assistant</div>
                <div className="text-xs text-gray-500">Policy: {policyNumber}</div>
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
                                ? "bg-brand-50 text-brand-700 font-medium"
                                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
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
                className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-gray-500 hover:text-gray-700 transition"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Sign Out</span>
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