"use client";

import React, { useEffect, useState } from "react";
import { getTenantDisclaimer } from "@/lib/api";

/**
 * DisclaimerModal — fetches disclaimer text configured in the back office.
 *
 * REPLACES your existing src/components/DisclaimerModal.tsx.
 *
 * Changes from the original:
 * - Fetches disclaimer text from /api/v1/tenant/disclaimer (back-office-managed)
 * - Respects the "disclaimer_enabled" flag — if disabled, never shows
 * - Falls back to a hardcoded default if the API call fails
 * - Still gated by sessionStorage so it only shows once per session
 */

interface Props {
  onAccept: () => void;
}

export default function DisclaimerModal({ onAccept }: Props) {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if already accepted this session
    if (sessionStorage.getItem("disclaimer_accepted")) {
      onAccept();
      return;
    }

    // Fetch from back office
    getTenantDisclaimer()
        .then((data) => {
          if (!data.disclaimer_enabled) {
            // Disclaimer disabled by admin — skip
            onAccept();
            return;
          }
          setText(data.disclaimer_text);
          setVisible(true);
        })
        .catch(() => {
          // Fallback — show default disclaimer
          setText(
              "This assistant provides information based on your insurance policy documents for " +
              "informational purposes only. It does not constitute professional insurance advice, " +
              "and should not be relied upon for coverage decisions. For binding interpretations, " +
              "claims, or policy changes, please contact your insurance agent directly."
          );
          setVisible(true);
        })
        .finally(() => setLoading(false));
  }, [onAccept]);

  if (!visible || loading) return null;

  const handleAccept = () => {
    sessionStorage.setItem("disclaimer_accepted", "true");
    setVisible(false);
    onAccept();
  };

  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/50">
        <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">ℹ️</span>
            <h2 className="text-lg font-semibold text-heading">Important Notice</h2>
          </div>

          <div className="text-sm text-secondary leading-relaxed mb-6 max-h-60 overflow-y-auto">
            {text.split("\n").map((paragraph, i) => (
                <p key={i} className={i > 0 ? "mt-3" : ""}>
                  {paragraph}
                </p>
            ))}
          </div>

          <button
              onClick={handleAccept}
              className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
  );
}
