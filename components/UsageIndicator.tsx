"use client";

import React, { useEffect, useState, useCallback } from "react";
import { getTenantUsage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

/**
 * UsageIndicator — shows current plan and usage stats.
 *
 * FIX 4: Polls every 2 minutes so plan changes from the back office
 *        reflect on the client sidebar without a page refresh.
 * FIX 3: Handles auth errors gracefully — if the API returns 401/403,
 *        it stops polling instead of causing error loops.
 */

interface UsageData {
  plan: string;
  plan_name: string;
  features: string[];
  period: string;
  queries: { used: number; limit: number; pct: number };
  documents: { used: number; limit: number };
  staff: { used: number; limit: number };
  policyholders: { used: number; limit: number };
  at_risk: boolean;
}

const POLL_INTERVAL = 2 * 60 * 1000; // 2 minutes

export default function UsageIndicator() {
  const { logout } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [authError, setAuthError] = useState(false);

  const fetchUsage = useCallback(() => {
    if (authError) return; // stop polling if auth is broken

    getTenantUsage()
        .then(setUsage)
        .catch((err) => {
          // If we get a 401/403, the token is invalid — stop polling
          if (err.message?.includes("401") || err.message?.includes("403")) {
            setAuthError(true);
          }
          // Otherwise silently fail — usage indicator is not critical
        });
  }, [authError]);

  // Fetch on mount + poll
  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchUsage]);

  // Don't render if we can't fetch or enterprise (unlimited)
  if (authError || !usage) return null;
  if (usage.queries.limit === 0) return null; // unlimited plan

  const pct = usage.queries.pct;
  const barColor =
      pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-amber-400" : "bg-emerald-400";
  const textColor =
      pct >= 90 ? "text-red-400" : pct >= 70 ? "text-amber-400" : "text-white/50";

  const formatLimit = (used: number, limit: number) =>
      limit === 0 ? `${used} / ∞` : `${used} / ${limit}`;

  return (
      <div className="px-3 py-2">
        <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-left"
        >
          <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-white/40 uppercase tracking-wider">
            {usage.plan_name}
          </span>
            <span className={`text-[10px] ${textColor}`}>
            {pct}%
          </span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
                className={`h-full ${barColor} rounded-full transition-all`}
                style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-white/30 mt-1">
            {usage.queries.used} / {usage.queries.limit} queries
          </div>
        </button>

        {expanded && (
            <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
              <div className="text-[10px] text-white/30">
                Period: {usage.period}
              </div>
              {[
                { label: "Queries", used: usage.queries.used, limit: usage.queries.limit },
                { label: "Documents", used: usage.documents.used, limit: usage.documents.limit },
                { label: "Staff", used: usage.staff.used, limit: usage.staff.limit },
              ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-[10px]">
                    <span className="text-white/40">{item.label}</span>
                    <span className="text-white/50">
                {formatLimit(item.used, item.limit)}
              </span>
                  </div>
              ))}
              {usage.at_risk && (
                  <div className="text-[10px] text-amber-400 bg-amber-400/10 rounded px-2 py-1 mt-1">
                    Approaching query limit
                  </div>
              )}
            </div>
        )}
      </div>
  );
}
