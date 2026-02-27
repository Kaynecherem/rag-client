"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  Shield, Search, FileText, FolderOpen, History, LogOut, Menu, X,
} from "lucide-react";

const navItems = [
  { href: "/staff/query", label: "Ask Questions", icon: Search },
  { href: "/staff/policies", label: "Policies", icon: FileText },
  { href: "/staff/communications", label: "Communications", icon: FolderOpen },
  { href: "/staff/history", label: "Query History", icon: History },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { isStaff, isAuthenticated, logout, email } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !isStaff) {
      router.replace("/auth");
    }
  }, [isAuthenticated, isStaff, router]);

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (!isStaff) return null;

  return (
    <div className="min-h-screen flex flex-col sm:flex-row">
      {/* Mobile Header */}
      <div className="sm:hidden bg-brand-800 text-white flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-brand-100" />
          <span className="font-semibold text-sm">Insurance RAG</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1">
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-brand-800 text-white px-4 pb-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  active
                    ? "bg-white/15 text-white font-medium"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            );
          })}
          <div className="pt-3 mt-3 border-t border-white/10">
            <div className="text-xs text-white/40 mb-2 px-3">{email}</div>
            <button
              onClick={() => { logout(); router.push("/auth"); }}
              className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition px-3 py-2"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden sm:flex w-64 bg-brand-800 text-white flex-col flex-shrink-0">
        <div className="p-5 flex items-center gap-3 border-b border-white/10">
          <Shield className="w-7 h-7 text-brand-100" />
          <div>
            <div className="font-semibold text-sm">Insurance RAG</div>
            <div className="text-xs text-brand-100">Staff Dashboard</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  active
                    ? "bg-white/15 text-white font-medium"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-white/40 mb-2">{email}</div>
          <button
            onClick={() => { logout(); router.push("/auth"); }}
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-50">{children}</main>
    </div>
  );
}