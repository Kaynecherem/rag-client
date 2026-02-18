"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthState {
  token: string | null;
  tenantId: string | null;
  role: "admin" | "staff" | "policyholder" | null;
  policyNumber: string | null; // For policyholders
  email: string | null;
}

interface AuthContextType extends AuthState {
  loginStaff: (token: string, tenantId: string, role: string, email: string) => void;
  loginPolicyholder: (token: string, tenantId: string, policyNumber: string) => void;
  logout: () => void;
  isStaff: boolean;
  isPolicyholder: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    token: null,
    tenantId: null,
    role: null,
    policyNumber: null,
    email: null,
  });

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("auth");
    if (saved) {
      try {
        setAuth(JSON.parse(saved));
      } catch {
        localStorage.removeItem("auth");
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (auth.token) {
      localStorage.setItem("auth", JSON.stringify(auth));
      localStorage.setItem("token", auth.token);
    } else {
      localStorage.removeItem("auth");
      localStorage.removeItem("token");
    }
  }, [auth]);

  const loginStaff = (token: string, tenantId: string, role: string, email: string) => {
    setAuth({ token, tenantId, role: role as "admin" | "staff", policyNumber: null, email });
  };

  const loginPolicyholder = (token: string, tenantId: string, policyNumber: string) => {
    setAuth({ token, tenantId, role: "policyholder", policyNumber, email: null });
  };

  const logout = () => {
    setAuth({ token: null, tenantId: null, role: null, policyNumber: null, email: null });
  };

  return (
    <AuthContext.Provider
      value={{
        ...auth,
        loginStaff,
        loginPolicyholder,
        logout,
        isStaff: auth.role === "admin" || auth.role === "staff",
        isPolicyholder: auth.role === "policyholder",
        isAuthenticated: !!auth.token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
