"use client";

/**
 * REPLACE: app/auth/page.tsx
 *
 * CHANGES:
 *   - staffAuth0Login calls now pass tenant_id/slug for scoping
 *   - Catches 409 "multiple_tenants" error → shows tenant picker UI
 *   - After picking a tenant, re-calls staffAuth0Login with the scoped tenant_id
 */

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuth } from "@/lib/auth-context";
import { useTenant } from "@/lib/tenant-context";
import { verifyPolicyholder, staffAuth0Login } from "@/lib/api";
import { User, Building2, Loader2 } from "lucide-react";

interface TenantOption {
  tenant_id: string;
  tenant_name: string;
  slug: string | null;
  role: string;
}

function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    loginStaff,
    loginPolicyholder,
    isAuthenticated,
    isStaff,
    isPolicyholder,
    hydrated,
  } = useAuth();
  const {
    loginWithPopup,
    getAccessTokenSilently,
    user: auth0User,
    isAuthenticated: auth0Authenticated,
    getIdTokenClaims,
    isLoading: auth0Loading,
  } = useAuth0();
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

      localStorage.setItem("tenant_id", tenantId || resolvedTenantId || "");
      loginPolicyholder(result.token, tenantId || resolvedTenantId || "", result.policy_number);
      router.replace("/policyholder");
    } catch (err: any) {
      setError(err.message || "Verification failed.");
      setLoading(false);
    }
  };

  if (!hydrated) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
    );
  }

  return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Logo / Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {tenant?.name || "Insurance RAG"}
            </h1>
            <p className="text-sm text-gray-500">
              Secure access to your insurance documents
            </p>
          </div>

          {/* TENANT PICKER (shown when multi-tenant) */}
          {tenantOptions && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <Building2 className="w-10 h-10 text-blue-500 mx-auto" />
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
                          className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
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
              </div>
          )}

          {/* NORMAL LOGIN (hidden when tenant picker is showing) */}
          {!tenantOptions && (
              <>
                {/* Mode tabs */}
                <div className="flex rounded-lg bg-gray-100 p-1">
                  <button
                      onClick={() => { setMode("staff"); setError(""); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                          mode === "staff"
                              ? "bg-white shadow text-gray-900"
                              : "text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    <Building2 className="w-4 h-4" />
                    Agency Staff
                  </button>
                  <button
                      onClick={() => { setMode("policyholder"); setError(""); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                          mode === "policyholder"
                              ? "bg-white shadow text-gray-900"
                              : "text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    <User className="w-4 h-4" />
                    Policyholder
                  </button>
                </div>

                {/* Staff login */}
                {mode === "staff" && (
                    <div className="space-y-4">
                      <button
                          onClick={handleStaffLogin}
                          disabled={loading || auth0Loading}
                          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Signing in…
                            </>
                        ) : (
                            "Sign in with Auth0"
                        )}
                      </button>
                      <p className="text-xs text-center text-gray-400">
                        Staff accounts are managed by your agency administrator.
                      </p>
                    </div>
                )}

                {/* Policyholder verification */}
                {mode === "policyholder" && (
                    <form onSubmit={handlePolicyholderVerify} className="space-y-4">
                      {!resolvedTenantId && !slug && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Agency Code
                            </label>
                            <input
                                type="text"
                                value={tenantId}
                                onChange={(e) => setTenantId(e.target.value)}
                                placeholder="Provided by your agency"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                            placeholder="e.g. POL-12345"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="flex gap-4 text-sm">
                        <label className="flex items-center gap-1.5">
                          <input
                              type="radio"
                              checked={verifyBy === "person"}
                              onChange={() => setVerifyBy("person")}
                          />
                          Last Name
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input
                              type="radio"
                              checked={verifyBy === "company"}
                              onChange={() => setVerifyBy("company")}
                          />
                          Company Name
                        </label>
                      </div>

                      {verifyBy === "person" ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                      ) : (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                      )}

                      <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Verifying…
                            </>
                        ) : (
                            "Verify & Access Policy"
                        )}
                      </button>
                    </form>
                )}
              </>
          )}

          {/* Error display */}
          {error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
                {error}
              </div>
          )}
        </div>
      </div>
  );
}

export default function AuthPageWrapper() {
  return (
      <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          }
      >
        <AuthPage />
      </Suspense>
  );
}
