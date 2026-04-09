"use client";

import React from "react";

/**
 * SuspendedScreen — full-page block shown when a tenant is suspended.
 *
 * Usage in staff/policyholder layouts:
 *   import SuspendedScreen from "@/components/SuspendedScreen";
 *   import { getTenantStatus } from "@/lib/api";
 *
 *   // In the layout component:
 *   const [suspended, setSuspended] = useState(false);
 *
 *   useEffect(() => {
 *     getTenantStatus()
 *       .then((data) => setSuspended(data.status === "suspended"))
 *       .catch(() => {});
 *   }, []);
 *
 *   if (suspended) return <SuspendedScreen />;
 */

export default function SuspendedScreen() {
  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-6">⚠️</div>
        <h1 className="text-2xl font-semibold text-heading mb-3">
          Account Suspended
        </h1>
        <p className="text-secondary leading-relaxed mb-6">
          Your agency&apos;s account has been temporarily suspended.
          This may be due to a billing issue, a policy violation, or an
          administrative action.
        </p>
        <div className="bg-card border border-border-default rounded-xl p-6 text-left space-y-3">
          <h2 className="text-sm font-semibold text-heading">What to do:</h2>
          <ul className="space-y-2 text-sm text-secondary">
            <li className="flex gap-2">
              <span className="text-muted flex-shrink-0">1.</span>
              Contact your account administrator
            </li>
            <li className="flex gap-2">
              <span className="text-muted flex-shrink-0">2.</span>
              Check your email for details about the suspension
            </li>
            <li className="flex gap-2">
              <span className="text-muted flex-shrink-0">3.</span>
              Reach out to support if you believe this is an error
            </li>
          </ul>
        </div>
        <p className="text-xs text-muted mt-6">
          Your data is safe and will be accessible once the account is reactivated.
        </p>
      </div>
    </div>
  );
}
