"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useAuth0 } from "@auth0/auth0-react";
import NotificationBanner from "@/components/NotificationBanner";
import UsageIndicator from "@/components/UsageIndicator";
import SuspendedScreen from "@/components/SuspendedScreen";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import { getTenantStatus, getCurrentUserInfo } from "@/lib/api";
import {
  Search, FileText, FolderOpen, History, LogOut, Menu, X,
  Users, UserCheck,
} from "lucide-react";

const baseNavItems = [
  { href: "/staff/query", label: "Ask Questions", icon: Search },
  { href: "/staff/policies", label: "Policies", icon: FileText },
  { href: "/staff/communications", label: "Communications", icon: FolderOpen },
  { href: "/staff/history", label: "Query History", icon: History },
];

const adminNavItems = [
  { href: "/staff/manage-staff", label: "Manage Staff", icon: Users },
  { href: "/staff/manage-policyholders", label: "Manage Policyholders", icon: UserCheck },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { isStaff, isAuthenticated, logout, email, role, updateRole, hydrated } = useAuth();
  const { logout: auth0Logout } = useAuth0();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [suspended, setSuspended] = useState(false);

  const isAdmin = role === "admin";
  const navItems = isAdmin ? [...baseNavItems, ...adminNavItems] : baseNavItems;

  const handleSignOut = () => {
    // Clear impersonation state
    localStorage.removeItem("impersonator");
    logout();
    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin + "/auth",
      },
    });
  };

  useEffect(() => {
    if (hydrated && (!isAuthenticated || !isStaff)) {
      router.replace("/auth");
    }
  }, [hydrated, isAuthenticated, isStaff, router]);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !isStaff) return;

    const syncFromBackend = () => {
      getTenantStatus()
          .then((data) => setSuspended(data.status === "suspended"))
          .catch(() => {});

      getCurrentUserInfo()
          .then((data) => {
            if (data.role && data.role !== role) {
              updateRole(data.role as "admin" | "staff");
            }
          })
          .catch(() => {});
    };

    syncFromBackend();
    const interval = setInterval(syncFromBackend, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [hydrated, isAuthenticated, isStaff, role, updateRole]);

  useEffect(() => {
    if (!hydrated) return;
    const onAdminPage = pathname.startsWith("/staff/manage-");
    if (onAdminPage && role !== "admin") {
      router.replace("/staff/query");
    }
  }, [role, pathname, hydrated, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (!hydrated || !isStaff) {
    return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
    );
  }

  if (suspended) {
    return <SuspendedScreen />;
  }

  return (
      <div className="h-screen flex flex-col">
        {/* Impersonation Banner — shown when viewing as superadmin */}
        <ImpersonationBanner />

        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Mobile Header */}
          <div className="sm:hidden bg-brand-800 text-white flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg overflow-hidden">
                <Image src="/patch-logo-blue.png" alt="Patch" width={28} height={28} className="w-full h-full object-cover" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-brand-100">Powered by Patch</span>
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
                  <UsageIndicator />
                  <div className="text-xs text-white/40 mb-2 px-3 mt-3">{email}</div>
                  <button
                      onClick={handleSignOut}
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
              <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                <Image src="/patch-logo-blue.png" alt="Patch" width={36} height={36} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.12em] text-brand-100">Powered by Patch</div>
                <div className="text-xs text-brand-200 mt-0.5">Staff Dashboard</div>
              </div>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {baseNavItems.map(({ href, label, icon: Icon }) => {
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

              {isAdmin && (
                  <>
                    <div className="pt-3 mt-3 border-t border-white/10">
                      <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-white/30">
                        Administration
                      </div>
                    </div>
                    {adminNavItems.map(({ href, label, icon: Icon }) => {
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
                  </>
              )}
            </nav>

            <div className="p-4 border-t border-white/10">
              <UsageIndicator />
              <div className="text-xs text-white/40 mb-2 mt-3">{email}</div>
              <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto bg-gray-50">
            <div className="max-w-5xl mx-auto px-4 pt-4">
              <NotificationBanner />
            </div>
            {children}
          </main>
        </div>
      </div>
  );
}