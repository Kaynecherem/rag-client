"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * ImpersonationBanner
 *
 * Detects if the current session is an impersonation (from superadmin "View As").
 * Shows a persistent banner at the top of the page.
 *
 * Detection:
 *  1. URL params: ?impersonate_token=...&impersonator=...
 *  2. localStorage: "impersonator" key set during auth
 *  3. JWT payload: "impersonated_by" field in the token
 *
 * Usage: Add to any layout that should show the impersonation banner:
 *   import ImpersonationBanner from "@/components/ImpersonationBanner";
 *   <ImpersonationBanner />
 */
export default function ImpersonationBanner() {
    const searchParams = useSearchParams();
    const [impersonator, setImpersonator] = useState<string | null>(null);

    useEffect(() => {
        // Check URL params first
        const urlImpersonator = searchParams.get("impersonator");
        if (urlImpersonator) {
            setImpersonator(urlImpersonator);
            localStorage.setItem("impersonator", urlImpersonator);
            return;
        }

        // Check localStorage
        const stored = localStorage.getItem("impersonator");
        if (stored) {
            setImpersonator(stored);
            return;
        }

        // Check JWT token for impersonated_by field
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split(".")[1]));
                if (payload.impersonated_by) {
                    setImpersonator(payload.impersonated_by);
                    localStorage.setItem("impersonator", payload.impersonated_by);
                }
            } catch {
                // Not a valid JWT or no impersonation field
            }
        }
    }, [searchParams]);

    if (!impersonator) return null;

    const handleEndSession = () => {
        localStorage.removeItem("impersonator");
        localStorage.removeItem("token");
        localStorage.removeItem("tenant_id");
        window.close();
    };

    return (
        <div className="bg-amber-500 text-gray-900 px-4 py-2 flex items-center justify-between text-sm font-medium z-50 relative">
            <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
                <span>
          Viewing as — <strong>{impersonator}</strong>
        </span>
                <span className="text-amber-800 text-xs ml-2">(Impersonation session — all actions are logged)</span>
            </div>
            <button
                onClick={handleEndSession}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded transition"
            >
                End Session
            </button>
        </div>
    );
}