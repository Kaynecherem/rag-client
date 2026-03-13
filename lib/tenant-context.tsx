// src/lib/tenant-context.tsx
//
// Provides tenant info resolved from the subdomain slug.
// Wrap your app with <TenantProvider> inside layout.tsx.
//
// Usage in any component:
//   const { tenant, tenantId, slug, loading } = useTenant();

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface TenantInfo {
    id: string;
    name: string;
    slug: string;
    status: string;
    plan?: string;
    widget_config?: Record<string, any>;
}

interface TenantContextType {
    tenant: TenantInfo | null;
    tenantId: string | null;
    slug: string | null;
    loading: boolean;
    error: string | null;
}

const TenantContext = createContext<TenantContextType>({
    tenant: null,
    tenantId: null,
    slug: null,
    loading: true,
    error: null,
});

export function useTenant() {
    return useContext(TenantContext);
}

function getSlugFromCookie(): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(/(?:^|;\s*)tenant-slug=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
    const [tenant, setTenant] = useState<TenantInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const slug = getSlugFromCookie();

    useEffect(() => {
        if (!slug) {
            // No subdomain — root domain or dev mode
            // Try to get tenant_id from localStorage (legacy flow)
            setLoading(false);
            return;
        }

        // Resolve slug to tenant info
        fetch(`${API_BASE}/api/v1/tenant/by-slug/${slug}`)
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error(
                        res.status === 404
                            ? "Agency not found. Please check the URL."
                            : "Failed to load agency information."
                    );
                }
                return res.json();
            })
            .then((data) => {
                setTenant(data);
                // Store tenant_id in localStorage for compatibility with existing code
                localStorage.setItem("tenant_id", data.id);
            })
            .catch((err) => {
                setError(err.message);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [slug]);

    return (
        <TenantContext.Provider
            value={{
                tenant,
                tenantId: tenant?.id || null,
                slug,
                loading,
                error,
            }}
        >
            {children}
        </TenantContext.Provider>
    );
}