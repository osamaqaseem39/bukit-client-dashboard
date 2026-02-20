"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<"super_admin" | "admin" | "client" | "user">;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated, hasRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      } else if (allowedRoles && user && !hasRole(allowedRoles)) {
        // Only redirect if user exists and doesn't have the required role
        router.replace("/dashboard");
      }
    }
  }, [loading, isAuthenticated, allowedRoles, hasRole, router, pathname, user]);

  if (loading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg border border-border bg-surface px-6 py-4 shadow-sm">
          <p className="text-sm text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user exists and if role check is needed
  if (allowedRoles && user) {
    const userHasRole = hasRole(allowedRoles);
    
    if (!userHasRole) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="max-w-md rounded-lg border border-border bg-surface px-6 py-5 text-center shadow-sm">
            <h2 className="text-base font-semibold text-text-primary">
              You don&apos;t have access to this page
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Your account is signed in, but your role ({user.role}) is not allowed to view this
              section of the dashboard. Required roles: {allowedRoles.join(", ")}
            </p>
            {process.env.NODE_ENV === "development" && (
              <p className="mt-2 text-xs text-text-secondary">
                Debug: User role is &quot;{user.role}&quot;
              </p>
            )}
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

