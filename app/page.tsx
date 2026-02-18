"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { isAuthenticated, isStaff } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth");
    } else if (isStaff) {
      router.replace("/staff/query");
    } else {
      router.replace("/policyholder");
    }
  }, [isAuthenticated, isStaff, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-gray-400">Loading...</div>
    </div>
  );
}
