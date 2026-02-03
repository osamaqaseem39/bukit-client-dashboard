"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["admin", "client"]}>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  );
}
