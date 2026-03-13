"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuth } from "@/lib/auth-context";
import { useTenant } from "@/lib/tenant-context";
import { verifyPolicyholder, staffAuth0Login } from "@/lib/api";
import { Shield, User, Building2, Loader2, LogIn } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
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

// Auto-set tenant from subdomain
  useEffect(() => {
    if (resolvedTenantId) {
      setTenantId(resolvedTenantId);
    } else {
      // Fallback: check localStorage (legacy flow)
      const stored = localStorage.getItem("tenant_id");
      if (stored) setTenantId(stored);
    }
  }, [resolvedTenantId]);


  // Load tenant_id from localStorage if previously set
  useEffect(() => {
    const saved = localStorage.getItem("tenant_id");
    if (saved) setTenantId(saved);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (hydrated && isAuthenticated) {
      if (isStaff) router.replace("/staff/query");
      else if (isPolicyholder) router.replace("/policyholder");
    }
  }, [hydrated, isAuthenticated, isStaff, isPolicyholder, router]);

  // Handle Auth0 callback
  useEffect(() => {
    console.log("Auth0 effect:", { auth0Authenticated, auth0User: auth0User?.email, loading, isAuthenticated });

    if (!auth0Authenticated || !auth0User || loading) return;
    if (isAuthenticated) return;

    (async () => {
      setLoading(true);
      setError("");
      try {
        console.log("Getting access token...");
        const accessToken = await getAccessTokenSilently();
        console.log("Got token, calling staff-login...");
        const result = await staffAuth0Login(accessToken, auth0User.email);
        console.log("Login result:", result);

        localStorage.setItem("tenant_id", result.tenant_id);
        loginStaff(result.token, result.tenant_id, result.role, result.email);
        router.replace("/staff/query");
      } catch (err: any) {
        console.error("Token exchange failed:", err);
        setError(err.message || "Login failed. Please try again.");
        setLoading(false);
      }
    })();
  }, [auth0Authenticated, auth0User]);

  // Staff login via Auth0 popup
  const handleStaffLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithPopup({
        authorizationParams: {
          scope: "openid profile email",
        },
      });

      // Get token immediately after popup — don't wait for useEffect
      const accessToken = await getAccessTokenSilently();
      const auth0User = await getIdTokenClaims();
      const email = auth0User?.email;

      console.log("Got token, exchanging with backend...", email);

      const result = await staffAuth0Login(accessToken, email);

      localStorage.setItem("tenant_id", result.tenant_id);
      loginStaff(result.token, result.tenant_id, result.role, result.email);
      router.replace("/staff/query");
    } catch (err: any) {
      if (err.message?.includes("cancelled") || err.message?.includes("closed")) {
        setLoading(false);
        return;
      }
      console.error("Auth0 login error:", err);
      setError(err.message || "Auth0 login failed. Please try again.");
      setLoading(false);
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
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Insurance RAG</h1>
          <p className="text-gray-500 mt-1 text-sm">Policy Intelligence Platform</p>
        </div>

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
                  <><LogIn className="w-5 h-5" /> Sign In</>
                )}
              </button>

              {error && (
                <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handlePolicyholderVerify}>
              {tenant && (
                  <div className="text-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">{tenant.name}</h2>
                  </div>
              )}
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Verify Your Identity
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                Enter your Policy Number and last name to access your policy.
              </p>

              <div className="space-y-4">
                {/* Tenant ID — hidden for most users, pre-filled from localStorage */}
                <input type="hidden" value={tenantId} />
                {!slug && !resolvedTenantId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Agency Code
                      </label>
                      <input
                          type="text"
                          value={tenantId}
                          onChange={(e) => setTenantId(e.target.value)}
                          placeholder="Provided by your insurance agency"
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
                    placeholder="e.g. POL-2024-HO-001"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVerifyBy("person")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm rounded-lg border transition ${
                      verifyBy === "person"
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <User className="w-4 h-4" /> Last Name
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerifyBy("company")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm rounded-lg border transition ${
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

              {error && (
                <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}
            </form>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-6 text-center">
          Powered by Insurance RAG — AI-driven policy intelligence
        </p>
      </div>
    </div>
  );
}
