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
import Image from "next/image";

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
      setError("Agency code is required. Ask your insurance provider for it.");
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Logo — Patch Blue */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4">
              <Image
                  src="/patch-logo-blue.png"
                  alt="Patch"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
              />
            </div>
            <p className="text-xs uppercase tracking-[0.15em] text-brand-600 mt-2">
              Powered by Patch
            </p>
            <p className="text-gray-500 mt-1 text-sm">Policy Intelligence Platform</p>
          </div>

          {/* ── TENANT PICKER (shown when multi-tenant) ── */}
          {tenantOptions && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
                <div className="text-center space-y-1">
                  <Building2 className="w-10 h-10 text-brand-600 mx-auto" />
                  <h2 className="text-lg font-semibold text-gray-800">
                    Select your agency
                  </h2>
                  <p className="text-sm text-gray-500">
                    Your account is linked to multiple agencies.
                  </p>
                </div>

                <div className="space-y-2">
                  {tenantOptions.map((t) => (
                      <button
                          key={t.tenant_id}
                          onClick={() => handleTenantSelect(t.tenant_id)}
                          disabled={loading}
                          className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-colors disabled:opacity-50"
                      >
                        <div className="text-left">
                          <div className="font-medium text-gray-900">{t.tenant_name}</div>
                          <div className="text-xs text-gray-500 capitalize">Role: {t.role}</div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>

                {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                      {error}
                    </div>
                )}
              </div>
          )}

          {/* ── NORMAL LOGIN (hidden when tenant picker is showing) ── */}
          {!tenantOptions && (
              <>
                {/* Mode Toggle */}
                <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                  <button
                      onClick={() => { setMode("staff"); setError(""); }}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition ${
                          mode === "staff"
                              ? "bg-white text-brand-700 shadow-sm"
                              : "text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    Staff Login
                  </button>
                  <button
                      onClick={() => { setMode("policyholder"); setError(""); }}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition ${
                          mode === "policyholder"
                              ? "bg-white text-brand-700 shadow-sm"
                              : "text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    Policyholder
                  </button>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  {mode === "staff" ? (
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Staff Login</h2>
                        <p className="text-sm text-gray-500 mb-6">
                          Sign in with your organization credentials to manage policies and agency documents.
                        </p>

                        <button
                            onClick={handleStaffLogin}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white py-3 rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50 transition"
                        >
                          {loading ? (
                              <><Loader2 className="w-5 h-5 animate-spin" /> Signing in...</>
                          ) : (
                              "Sign In with SSO"
                          )}
                        </button>

                        {error && mode === "staff" && (
                            <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                              {error}
                            </div>
                        )}
                      </div>
                  ) : (
                      <form onSubmit={handlePolicyholderVerify}>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Policy Access</h2>
                        <p className="text-sm text-gray-500 mb-6">
                          Verify your identity to access your policy information.
                        </p>

                        <div className="space-y-4">
                          {/* Show tenant ID field only if not resolved from subdomain */}
                          {!resolvedTenantId && !slug && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Agency Code
                                </label>
                                <input
                                    type="text"
                                    value={tenantId}
                                    onChange={(e) => setTenantId(e.target.value)}
                                    placeholder="Your agency code"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm"
                                />
                              </div>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Policy Number
                            </label>
                            <input
                                type="text"
                                value={policyNumber}
                                onChange={(e) => setPolicyNumber(e.target.value)}
                                placeholder="e.g., POL-001"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setVerifyBy("person")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm border transition ${
                                    verifyBy === "person"
                                        ? "border-brand-500 bg-brand-50 text-brand-700"
                                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                                }`}
                            >
                              <User className="w-4 h-4" /> Person
                            </button>
                            <button
                                type="button"
                                onClick={() => setVerifyBy("company")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm border transition ${
                                    verifyBy === "company"
                                        ? "border-brand-500 bg-brand-50 text-brand-700"
                                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                                }`}
                            >
                              <Building2 className="w-4 h-4" /> Company
                            </button>
                          </div>

                          {verifyBy === "person" ? (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Last Name
                                </label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    placeholder="Your last name"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm"
                                />
                              </div>
                          ) : (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Company Name
                                </label>
                                <input
                                    type="text"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    placeholder="Your company name"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm"
                                />
                              </div>
                          )}

                          <button
                              type="submit"
                              disabled={loading}
                              className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white py-3 rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50 transition"
                          >
                            {loading ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</>
                            ) : (
                                "Verify & Access Policy"
                            )}
                          </button>
                        </div>

                        {error && mode === "policyholder" && (
                            <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                              {error}
                            </div>
                        )}
                      </form>
                  )}
                </div>
              </>
          )}

          <p className="text-xs text-gray-400 mt-6 text-center">
            Powered by Patch — AI-driven policy intelligence
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