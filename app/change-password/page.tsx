"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function ChangePasswordPage() {
  const { user, loading, isAuthenticated, changePassword } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/change-password")}`);
    }
  }, [loading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match");
      return;
    }
    setSubmitLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-gray-50/80">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-gray-50/80 py-12 px-4">
      <div className="absolute top-0 right-0 h-[500px] w-[700px] -translate-y-1/3 translate-x-1/3 rounded-full bg-pink-200/25 blur-[100px]" />
      <div className="absolute bottom-0 left-0 h-[400px] w-[500px] translate-y-1/3 -translate-x-1/3 rounded-full bg-purple-200/25 blur-[80px]" />

      <div className="relative z-10 w-full max-w-[420px] rounded-3xl bg-white px-10 py-10 shadow-xl shadow-gray-200/50 ring-1 ring-gray-100 sm:px-12 sm:py-12">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-gray-800">Change your password</h1>
          <p className="mt-2 text-sm text-gray-500">
            You are using a temporary password. Please set a new password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              required
              className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-[15px] text-gray-800 placeholder:text-gray-400 focus:border-fuchsia-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
              className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-[15px] text-gray-800 placeholder:text-gray-400 focus:border-fuchsia-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={6}
              className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-[15px] text-gray-800 placeholder:text-gray-400 focus:border-fuchsia-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-100"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitLoading}
            className="h-12 w-full rounded-xl bg-gray-900 px-4 text-[15px] font-semibold uppercase tracking-wide text-fuchsia-400 shadow-lg shadow-gray-900/20 transition hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitLoading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
