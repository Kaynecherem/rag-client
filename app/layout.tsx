import type { Metadata } from "next";
import { TenantProvider } from "@/lib/tenant-context";
import { AuthProvider } from "@/lib/auth-context";
import Auth0ProviderWrapper from "@/components/Auth0ProviderWrapper";
import "./globals.css";

export const metadata: Metadata = {
    title: "Insurance RAG",
    description: "AI-powered insurance policy intelligence",
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
        <body>
        <Auth0ProviderWrapper>
            <AuthProvider>
                <TenantProvider>
                    {children}
                </TenantProvider>
            </AuthProvider>
        </Auth0ProviderWrapper>
        </body>
        </html>
    );
}

