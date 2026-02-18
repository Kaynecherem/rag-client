"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { testSetup, verifyPolicyholder } from "@/lib/api";
import { Shield, User, Building2 } from "lucide-react";

export default function AuthPage() {
  const [mode, setMode] = useState<"staff" | "policyholder">("policyholder");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { loginStaff, loginPolicyholder } = useAuth();
  const router = useRouter();

  // Policyholder fields
  const [policyNumber, setPolicyNumber] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [verifyBy, setVerifyBy] = useState<"person" | "company">("person");

  // For dev: stored tenant ID from test-setup
  const [tenantId, setTenantId] = useState("");

  const handleStaffLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await testSetup();
      loginStaff(data.staff_token, data.tenant_id, "admin", "admin@sunshine.test");
      router.push("/staff/query");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePolicyholderVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // If no tenant ID yet, get one from test-setup
    let tid = tenantId;
    if (!tid) {
      try {
        const setup = await testSetup();
        tid = setup.tenant_id;
        setTenantId(tid);
      } catch (err: any) {
        setError("Could not connect to server: " + err.message);
        setLoading(false);
        return;
      }
    }

    try {
      const data = await verifyPolicyholder({
        tenant_id: tid,
        policy_number: policyNumber,
        last_name: verifyBy === "person" ? lastName : undefined,
        company_name: verifyBy === "company" ? companyName : undefined,
      });

      if (data.verified && data.token) {
        loginPolicyholder(data.token, tid, policyNumber);
        router.push("/policyholder");
      } else {
        setError("Verification failed. Check your details and try again.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-800 to-brand-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Insurance Policy Assistant</h1>
          <p className="text-brand-100 mt-1">Ask questions about your insurance policy</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-white/10 rounded-lg p-1 mb-6">
          <button
            onClick={() => { setMode("policyholder"); setError(""); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              mode === "policyholder"
                ? "bg-white text-brand-800 shadow"
                : "text-white/70 hover:text-white"
            }`}
          >
            Policyholder
          </button>
          <button
            onClick={() => { setMode("staff"); setError(""); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              mode === "staff"
                ? "bg-white text-brand-800 shadow"
                : "text-white/70 hover:text-white"
            }`}
          >
            Agency Staff
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {mode === "staff" ? (
            /* Staff Login */
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Staff Login</h2>
              <p className="text-sm text-gray-500 mb-6">
                Sign in to manage policies and agency documents.
              </p>
              <button
                onClick={handleStaffLogin}
                disabled={loading}
                className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition"
              >
                {loading ? "Connecting..." : "Sign In as Test Admin"}
              </button>
              <p className="text-xs text-gray-400 mt-3 text-center">
                Development mode — Auth0 integration coming in production
              </p>
            </div>
          ) : (
            /* Policyholder Verification */
            <form onSubmit={handlePolicyholderVerify}>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Verify Your Identity
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                Enter your Policy Number and last name to access your policy.
              </p>

              <div className="space-y-4">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  />
                </div>

                {/* Verify by toggle */}
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
                      placeholder="e.g. Smith"
                      required={verifyBy === "person"}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
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
                      placeholder="e.g. Springfield Hardware"
                      required={verifyBy === "company"}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition"
                >
                  {loading ? "Verifying..." : "Access My Policy"}
                </button>
              </div>
            </form>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Test credentials hint */}
        <div className="mt-4 text-center text-xs text-white/40">
          Test: POL-2024-HO-001 / Smith · POL-2024-AU-002 / Rodriguez · POL-2024-CGL-003 / Springfield Hardware
        </div>
      </div>
    </div>
  );
}
