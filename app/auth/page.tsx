"use client";

/**
 * app/auth/page.tsx
 *
 * Patch-branded auth page with multi-tenant support.
 * - Preserves original Patch logo, branding, and layout
 * - Adds tenant picker when user belongs to multiple agencies
 * - staffAuth0Login calls pass tenant_id/slug for scoping
 */

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuth } from "@/lib/auth-context";
import { useTenant } from "@/lib/tenant-context";
import { verifyPolicyholder, staffAuth0Login } from "@/lib/api";
import { User, Building2, Loader2 } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

interface TenantOption {
  tenant_id: string;
  tenant_name: string;
  slug: string | null;
  role: string;
}

function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginStaff, loginPolicyholder, isAuthenticated, isStaff, isPolicyholder, hydrated } = useAuth();
  const { loginWithPopup, getAccessTokenSilently, user: auth0User, isAuthenticated: auth0Authenticated, getIdTokenClaims, isLoading: auth0Loading } = useAuth0();
  const { tenant, tenantId: resolvedTenantId, slug } = useTenant();
  const { theme } = useTheme();
  const logoSrc = theme === "dark" ? "/patch-premium-finance-logo-dark.svg" : "/patch-premium-finance-logo.svg";

  const [mode, setMode] = useState<"staff" | "policyholder">("staff");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Policyholder form state
  const [policyNumber, setPolicyNumber] = useState("");
  const [verifyBy, setVerifyBy] = useState<"person" | "company">("person");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [tenantId, setTenantId] = useState("");

  // Multi-tenant picker state
  const [tenantOptions, setTenantOptions] = useState<TenantOption[] | null>(null);
  const [pendingAccessToken, setPendingAccessToken] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  // Auto-set tenant from subdomain
  useEffect(() => {
    if (resolvedTenantId) {
      setTenantId(resolvedTenantId);
    } else {
      const stored = localStorage.getItem("tenant_id");
      if (stored) setTenantId(stored);
    }
  }, [resolvedTenantId]);

  // Load tenant_id from localStorage if previously set
  useEffect(() => {
    const saved = localStorage.getItem("tenant_id");
    if (saved) setTenantId(saved);
  }, []);

  // Handle impersonation token from URL params (superadmin "View As")
  useEffect(() => {
    if (!hydrated) return;
    const impersonateToken = searchParams.get("impersonate_token");
    const impersonator = searchParams.get("impersonator");
    const impTenantId = searchParams.get("tenant_id");

    if (impersonateToken && impTenantId) {
      localStorage.setItem("token", impersonateToken);
      localStorage.setItem("tenant_id", impTenantId);
      if (impersonator) {
        localStorage.setItem("impersonator", impersonator);
      }

      try {
        const payload = JSON.parse(atob(impersonateToken.split(".")[1]));
        if (payload.type === "staff_session") {
          loginStaff(impersonateToken, impTenantId, payload.role || "admin", payload.email || "");
          router.replace("/staff/query");
        } else {
          loginPolicyholder(impersonateToken, impTenantId, payload.policy_number || payload.sub || "");
          router.replace("/policyholder");
        }
      } catch {
        loginStaff(impersonateToken, impTenantId, "admin", "");
        router.replace("/staff/query");
      }
      return;
    }
  }, [hydrated, searchParams, loginStaff, loginPolicyholder, router]);

  // Redirect if already authenticated
  useEffect(() => {
    if (hydrated && isAuthenticated) {
      if (isStaff) router.replace("/staff/query");
      else if (isPolicyholder) router.replace("/policyholder");
    }
  }, [hydrated, isAuthenticated, isStaff, isPolicyholder, router]);

  // Handle Auth0 callback (redirect flow)
  useEffect(() => {
    if (!auth0Authenticated || !auth0User || loading) return;
    if (isAuthenticated) return;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const accessToken = await getAccessTokenSilently();
        const result = await staffAuth0Login(
            accessToken,
            auth0User.email,
            resolvedTenantId || undefined,
            slug || undefined
        );

        localStorage.setItem("tenant_id", result.tenant_id);
        loginStaff(result.token, result.tenant_id, result.role, result.email);
        router.replace("/staff/query");
      } catch (err: any) {
        if (err.code === "multiple_tenants" && err.tenants) {
          const accessToken = await getAccessTokenSilently();
          setPendingAccessToken(accessToken);
          setPendingEmail(auth0User.email || null);
          setTenantOptions(err.tenants);
          setLoading(false);
          return;
        }
        console.error("Token exchange failed:", err);
        setError(err.message || "Login failed. Please try again.");
        setLoading(false);
      }
    })();
  }, [auth0Authenticated, auth0User]);

  // Helper: complete login after Auth0 (shared by popup + tenant picker)
  const completeStaffLogin = async (
      accessToken: string,
      email: string | undefined,
      scopedTenantId?: string,
      scopedSlug?: string
  ) => {
    const result = await staffAuth0Login(accessToken, email, scopedTenantId, scopedSlug);
    localStorage.setItem("tenant_id", result.tenant_id);
    loginStaff(result.token, result.tenant_id, result.role, result.email);
    router.replace("/staff/query");
  };

  // Staff login via Auth0 popup
  const handleStaffLogin = async () => {
    setError("");
    setTenantOptions(null);
    setLoading(true);
    try {
      await loginWithPopup({
        authorizationParams: {
          scope: "openid profile email",
        },
      });

      const accessToken = await getAccessTokenSilently();
      const claims = await getIdTokenClaims();
      const email = claims?.email;

      await completeStaffLogin(
          accessToken,
          email,
          resolvedTenantId || undefined,
          slug || undefined
      );
    } catch (err: any) {
      if (err.message?.includes("cancelled") || err.message?.includes("closed")) {
        setLoading(false);
        return;
      }
      if (err.code === "multiple_tenants" && err.tenants) {
        const accessToken = await getAccessTokenSilently();
        const claims = await getIdTokenClaims();
        setPendingAccessToken(accessToken);
        setPendingEmail(claims?.email || null);
        setTenantOptions(err.tenants);
        setLoading(false);
        return;
      }
      console.error("Auth0 login error:", err);
      setError(err.message || "Auth0 login failed. Please try again.");
      setLoading(false);
    }
  };

  // Handle tenant selection for multi-tenant users
  const handleTenantSelect = async (selectedTenantId: string) => {
    if (!pendingAccessToken) return;
    setError("");
    setLoading(true);
    try {
      await completeStaffLogin(pendingAccessToken, pendingEmail || undefined, selectedTenantId);
    } catch (err: any) {
      console.error("Tenant-scoped login failed:", err);
      setError(err.message || "Login failed. Please try again.");
      setLoading(false);
    } finally {
      setTenantOptions(null);
      setPendingAccessToken(null);
      setPendingEmail(null);
    }
  };

  // Policyholder verification
  const handlePolicyholderVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId.trim() && !slug) {
      setError("Please access this page from your agency's URL.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await verifyPolicyholder({
        tenant_id: tenantId.trim() || undefined,
        slug: slug || undefined,
        policy_number: policyNumber.trim(),
        last_name: verifyBy === "person" ? lastName.trim() : undefined,
        company_name: verifyBy === "company" ? companyName.trim() : undefined,
      });

      localStorage.setItem("tenant_id", tenantId.trim());
      loginPolicyholder(result.token, tenantId.trim(), result.policy_number);
      router.replace("/policyholder");
    } catch (err: any) {
      setError(err.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated || auth0Loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-page">
          <div className="animate-pulse text-muted">Loading...</div>
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-page flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Logo — Patch Premium Finance */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4" style={{ height: '64px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                  src={logoSrc}
                  alt="Patch Premium Finance"
                  style={{ height: '64px', width: 'auto' }}
                  className="mx-auto"
              />
            </div>
            <p className="text-secondary mt-1 text-[15px] font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
              Policy Intelligence
            </p>
          </div>

          {/* ── TENANT PICKER (shown when multi-tenant) ── */}
          {tenantOptions && (
              <div className="bg-card rounded-lg shadow-sm border border-border-default p-6 space-y-4">
                <div className="text-center space-y-1">
                  <Building2 className="w-10 h-10 text-heading mx-auto" />
                  <h2 className="text-lg font-medium text-heading">
                    Select your agency
                  </h2>
                  <p className="text-sm text-secondary">
                    Your account is linked to multiple agencies.
                  </p>
                </div>

                <div className="space-y-2">
                  {tenantOptions.map((t) => (
                      <button
                          key={t.tenant_id}
                          onClick={() => handleTenantSelect(t.tenant_id)}
                          disabled={loading}
                          className="w-full flex items-center justify-between p-4 rounded-lg border border-border-default hover:border-heading hover:bg-surface transition-colors disabled:opacity-50"
                      >
                        <div className="text-left">
                          <div className="font-medium text-heading">{t.tenant_name}</div>
                          <div className="text-xs text-secondary capitalize">Role: {t.role}</div>
                        </div>
                        <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                  ))}
                </div>

                <button
                    onClick={() => {
                      setTenantOptions(null);
                      setPendingAccessToken(null);
                      setPendingEmail(null);
                    }}
                    className="w-full text-sm text-secondary hover:text-heading"
                >
                  Cancel
                </button>

                {error && (
                    <div className="text-sm text-[#E52431] bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                      {error}
                    </div>
                )}
              </div>
          )}

          {/* ── NORMAL LOGIN (hidden when tenant picker is showing) ── */}
          {!tenantOptions && (
              <>
                {/* Mode Toggle */}
                <div className="flex bg-surface rounded-lg p-1 mb-6">
                  <button
                      onClick={() => { setMode("staff"); setError(""); }}
                      className={`flex-1 py-2.5 text-[15px] font-medium rounded-md transition ${
                          mode === "staff"
                              ? "bg-card text-heading shadow-sm"
                              : "text-secondary hover:text-heading"
                      }`}
                  >
                    Staff login
                  </button>
                  <button
                      onClick={() => { setMode("policyholder"); setError(""); }}
                      className={`flex-1 py-2.5 text-[15px] font-medium rounded-md transition ${
                          mode === "policyholder"
                              ? "bg-card text-heading shadow-sm"
                              : "text-secondary hover:text-heading"
                      }`}
                  >
                    Policyholder
                  </button>
                </div>

                {/* Card */}
                <div className="bg-card rounded-lg shadow-sm border border-border-default p-6">
                  {mode === "staff" ? (
                      <div>
                        <h2 className="text-lg font-medium text-heading mb-2">Staff login</h2>
                        <p className="text-sm text-secondary mb-6">
                          Sign in with your organization credentials to manage policies and agency documents.
                        </p>

                        <button
                            onClick={handleStaffLogin}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-primary-btn text-white py-3 rounded-lg font-medium text-[15px] hover:bg-primary-btn-hover disabled:opacity-50 transition min-h-[44px]"
                        >
                          {loading ? (
                              <><Loader2 className="w-5 h-5 animate-spin" /> Signing in...</>
                          ) : (
                              "Sign in with SSO"
                          )}
                        </button>

                        {error && mode === "staff" && (
                            <div className="mt-4 text-sm text-[#E52431] bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                              {error}
                            </div>
                        )}
                      </div>
                  ) : (
                      <form onSubmit={handlePolicyholderVerify}>
                        <h2 className="text-lg font-medium text-heading mb-2">Policy access</h2>
                        <p className="text-sm text-secondary mb-6">
                          Verify your identity to access your policy information.
                        </p>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-heading mb-1">
                              Policy number
                            </label>
                            <input
                                type="text"
                                value={policyNumber}
                                onChange={(e) => setPolicyNumber(e.target.value)}
                                placeholder="e.g., POL-001"
                                required
                                className="w-full px-4 py-3 bg-card border border-border-default rounded focus:border-heading focus:ring-0 outline-none text-sm placeholder-muted"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setVerifyBy("person")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm border transition min-h-[44px] ${
                                    verifyBy === "person"
                                        ? "border-heading bg-surface text-heading"
                                        : "border-border-default text-secondary hover:border-muted"
                                }`}
                            >
                              <User className="w-4 h-4" /> Person
                            </button>
                            <button
                                type="button"
                                onClick={() => setVerifyBy("company")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm border transition min-h-[44px] ${
                                    verifyBy === "company"
                                        ? "border-heading bg-surface text-heading"
                                        : "border-border-default text-secondary hover:border-muted"
                                }`}
                            >
                              <Building2 className="w-4 h-4" /> Company
                            </button>
                          </div>

                          {verifyBy === "person" ? (
                              <div>
                                <label className="block text-sm font-medium text-heading mb-1">
                                  Last name
                                </label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    placeholder="Your last name"
                                    required
                                    className="w-full px-4 py-3 bg-card border border-border-default rounded focus:border-heading focus:ring-0 outline-none text-sm placeholder-muted"
                                />
                              </div>
                          ) : (
                              <div>
                                <label className="block text-sm font-medium text-heading mb-1">
                                  Company name
                                </label>
                                <input
                                    type="text"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    placeholder="Your company name"
                                    required
                                    className="w-full px-4 py-3 bg-card border border-border-default rounded focus:border-heading focus:ring-0 outline-none text-sm placeholder-muted"
                                />
                              </div>
                          )}

                          <button
                              type="submit"
                              disabled={loading}
                              className="w-full flex items-center justify-center gap-2 bg-primary-btn text-white py-3 rounded-lg font-medium text-[15px] hover:bg-primary-btn-hover disabled:opacity-50 transition min-h-[44px]"
                          >
                            {loading ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</>
                            ) : (
                                "Verify & access policy"
                            )}
                          </button>
                        </div>

                        {error && mode === "policyholder" && (
                            <div className="mt-4 text-sm text-[#E52431] bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                              {error}
                            </div>
                        )}
                      </form>
                  )}
                </div>
              </>
          )}

          <p className="text-xs text-muted mt-6 text-center">
            Powered by Patch Premium Finance
          </p>
        </div>
      </div>
  );
}

export default function AuthPageWrapper() {
  return (
      <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="animate-pulse text-gray-400">Loading...</div>
            </div>
          }
      >
        <AuthPage />
      </Suspense>
  );
}