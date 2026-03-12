"use client";

import React from "react";
import { Auth0Provider } from "@auth0/auth0-react";

/**
 * Auth0ProviderWrapper — wraps the app with Auth0 context.
 *
 * Place this in your root layout (src/app/layout.tsx) wrapping children:
 *
 *   import Auth0ProviderWrapper from "@/components/Auth0ProviderWrapper";
 *
 *   <Auth0ProviderWrapper>
 *     <AuthProvider>
 *       {children}
 *     </AuthProvider>
 *   </Auth0ProviderWrapper>
 *
 * Environment variables needed in .env.local:
 *   NEXT_PUBLIC_AUTH0_DOMAIN=insurance-rag.us.auth0.com
 *   NEXT_PUBLIC_AUTH0_CLIENT_ID=XjUjYKAkzT12uJ6vGhekTZtBUKIOxx0b
 *   NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.insurance-rag.com
 */

const AUTH0_DOMAIN = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || "insurance-rag.us.auth0.com";
const AUTH0_CLIENT_ID = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || "XjUjYKAkzT12uJ6vGhekTZtBUKIOxx0b";
const AUTH0_AUDIENCE = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || "https://api.insurance-rag.com";

export default function Auth0ProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: typeof window !== "undefined" ? window.location.origin : "",
        audience: AUTH0_AUDIENCE,
        scope: "openid profile email",
      }}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
}
