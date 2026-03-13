// src/middleware.ts
//
// Next.js middleware that detects the tenant slug from the subdomain
// and injects it as a header for all pages to read.
//
// Examples:
//   levanti.agencylensai.com  → slug = "levanti"
//   agencylensai.com          → slug = null (root domain)
//   localhost:3000             → slug = null (dev mode)

import { NextRequest, NextResponse } from "next/server";

// Domains where subdomains should be extracted
const CUSTOM_DOMAINS = ["agencylensai.com"];

// Subdomains that are NOT tenant slugs
const RESERVED_SUBDOMAINS = new Set([
    "www",
    "api",
    "console",
    "admin",
    "app",
    "staging",
    "dev",
]);

export function middleware(request: NextRequest) {
    const hostname = request.headers.get("host") || "";
    const slug = extractTenantSlug(hostname);

    // Clone the headers and add the tenant slug
    const response = NextResponse.next();

    if (slug) {
        // Set a request header that pages/layouts can read
        response.headers.set("x-tenant-slug", slug);

        // Also set a cookie so client-side JS can read it
        // (headers aren't accessible from client components)
        response.cookies.set("tenant-slug", slug, {
            path: "/",
            sameSite: "lax",
            // Don't set secure in dev
            secure: hostname.includes("agencylensai.com"),
        });
    } else {
        // Clear the cookie if no slug (root domain or dev)
        response.cookies.delete("tenant-slug");
    }

    return response;
}

function extractTenantSlug(hostname: string): string | null {
    // Remove port if present
    const host = hostname.split(":")[0];

    // Check each custom domain
    for (const domain of CUSTOM_DOMAINS) {
        if (host.endsWith(`.${domain}`)) {
            const subdomain = host.replace(`.${domain}`, "");

            // Ignore reserved subdomains
            if (RESERVED_SUBDOMAINS.has(subdomain)) {
                return null;
            }

            // Ignore multi-level subdomains (e.g., a.b.agencylensai.com)
            if (subdomain.includes(".")) {
                return null;
            }

            return subdomain;
        }
    }

    return null;
}

// Run middleware on all routes except static files and API routes
export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|api/).*)",
    ],
};