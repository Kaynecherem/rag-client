"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Shield, MessageSquare, History, LogOut } from "lucide-react";

const navItems = [
  { href: "/policyholder", label: "Ask Questions", icon: MessageSquare },
  { href: "/policyholder/history", label: "My History", icon: History },
];

export default function PolicyholderLayout({ children }: { children: React.ReactNode }) {
  const { isPolicyholder, isAuthenticated, logout, policyNumber } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated || !isPolicyholder) {
      router.replace("/auth");
    }
  }, [isAuthenticated, isPolicyholder, router]);

  if (!isPolicyholder) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Nav */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-brand-600 rounded-xl flex items-center justify-center">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
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
          </div>

          {/* Sign Out */}
          <button
            onClick={() => { logout(); router.push("/auth"); }}
            className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-gray-500 hover:text-gray-700 transition"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}