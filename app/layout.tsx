import type { Metadata } from "next";
import { TenantProvider } from "@/lib/tenant-context";
import { AuthProvider } from "@/lib/auth-context";
import Auth0ProviderWrapper from "@/components/Auth0ProviderWrapper";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
    title: "Patch Premium Finance — Policy Intelligence",
    description: "AI-powered policy intelligence, powered by Patch Premium Finance",
    icons: {
        icon: "/favicon.svg",
    },
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
        <body>
        <ThemeProvider>
            <Auth0ProviderWrapper>
                <AuthProvider>
                    <TenantProvider>
                        {children}
                    </TenantProvider>
                </AuthProvider>
            </Auth0ProviderWrapper>
        </ThemeProvider>
        </body>
        </html>
    );
}
