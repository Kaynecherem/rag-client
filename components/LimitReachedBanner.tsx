"use client";

import React from "react";

/**
 * LimitReachedBanner — displayed when a query or upload fails with 429.
 *
 * Usage in query/upload components:
 *
 *   import LimitReachedBanner from "@/components/LimitReachedBanner";
 *
 *   // In your error handler:
 *   const [limitError, setLimitError] = useState<{error: string; detail: string; usage?: any} | null>(null);
 *
 *   try {
 *     const result = await queryPolicy(policyNumber, question);
 *   } catch (err) {
 *     // Check if it's a usage limit error
 *     if (err.message.includes("limit exceeded")) {
 *       setLimitError({ error: "Query limit exceeded", detail: err.message });
 *     }
 *   }
 *
 *   {limitError && <LimitReachedBanner error={limitError} onDismiss={() => setLimitError(null)} />}
 */

interface Props {
  error: {
    error: string;
    detail: string;
    usage?: { used: number; limit: number };
  };
  onDismiss?: () => void;
}

export default function LimitReachedBanner({ error, onDismiss }: Props) {
  const isQuery = error.error.toLowerCase().includes("query");
  const isDocument = error.error.toLowerCase().includes("document");

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">
          {isQuery ? "📊" : isDocument ? "📄" : "⚠️"}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-800">
            {isQuery ? "Monthly Query Limit Reached" : isDocument ? "Document Limit Reached" : "Limit Reached"}
          </h3>
          <p className="text-xs text-red-600 mt-1 leading-relaxed">
            {error.detail}
          </p>
          {error.usage && (
            <div className="mt-3">
              <div className="h-2 bg-red-200 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: "100%" }} />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-red-500">
                <span>{error.usage.used} used</span>
                <span>{error.usage.limit} limit</span>
              </div>
            </div>
          )}
          <p className="text-xs text-red-500 mt-2">
            Contact your agency administrator to upgrade your plan.
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-600 text-sm flex-shrink-0"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
