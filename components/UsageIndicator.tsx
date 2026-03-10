"use client";

import React, { useEffect, useState } from "react";
import { getTenantUsage } from "@/lib/api";

/**
 * UsageIndicator — shows current plan and usage stats.
 *
 * Place this in the staff layout sidebar or header:
 *   import UsageIndicator from "@/components/UsageIndicator";
 *   <UsageIndicator />
 *
 * Shows a compact usage bar for queries. Expands on click to show
 * full usage details. Turns amber at 70% and red at 90%.
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

export default function UsageIndicator() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    getTenantUsage()
      .then(setUsage)
      .catch(() => setError(true));
  }, []);

  // Don't render if we can't fetch or enterprise (unlimited)
  if (error || !usage) return null;
  if (usage.queries.limit === 0) return null; // unlimited plan

  const pct = usage.queries.pct;
  const barColor =
    pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-amber-400" : "bg-emerald-400";
  const textColor =
    pct >= 90 ? "text-red-400" : pct >= 70 ? "text-amber-400" : "text-gray-400";

  const formatLimit = (used: number, limit: number) =>
    limit === 0 ? `${used} / ∞` : `${used} / ${limit}`;

  return (
    <div className="px-3 py-2">
      {/* Compact view */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">
            {usage.plan_name}
          </span>
          <span className={`text-[10px] ${textColor}`}>
            {pct}%
          </span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <div className="text-[10px] text-gray-600 mt-1">
          {usage.queries.used} / {usage.queries.limit} queries
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 space-y-2 border-t border-gray-800 pt-3">
          <div className="text-[10px] text-gray-500">
            Period: {usage.period}
          </div>
          {[
            { label: "Queries", ...usage.queries },
            { label: "Documents", used: usage.documents.used, limit: usage.documents.limit },
            { label: "Staff", used: usage.staff.used, limit: usage.staff.limit },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between text-[10px]">
              <span className="text-gray-500">{item.label}</span>
              <span className="text-gray-400">
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
