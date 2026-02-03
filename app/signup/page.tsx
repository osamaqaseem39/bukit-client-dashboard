"use client";

import React, { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { registerApi } from "@/lib/api";

function SignupPageInner() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await registerApi({ name, email, password });
      router.replace("/login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => router.back();

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-gray-50/80 px-4 py-12">
      <div className="absolute top-0 right-0 h-[500px] w-[700px] -translate-y-1/3 translate-x-1/3 rounded-full bg-pink-200/25 blur-[100px]" />
      <div className="absolute bottom-0 left-0 h-[400px] w-[500px] translate-y-1/3 -translate-x-1/3 rounded-full bg-purple-200/25 blur-[80px]" />

      <button
        onClick={handleClose}
        className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full text-fuchsia-500 hover:bg-fuchsia-50 hover:text-fuchsia-600 transition-colors"
        aria-label="Close"
      >
        <X className="h-5 w-5" strokeWidth={2.5} />
      </button>

      <div className="relative z-10 w-full max-w-[520px] rounded-3xl bg-white px-12 py-12 shadow-xl shadow-gray-200/50 ring-1 ring-gray-100 sm:px-14 sm:py-14">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold uppercase tracking-[0.2em] text-gray-400">
            BRAND NAME AND LOGO
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              required
              className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-[15px] text-gray-800 placeholder:text-gray-400 focus:border-fuchsia-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-100 transition-all"
            />
          </div>
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter Email"
              required
              className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-[15px] text-gray-800 placeholder:text-gray-400 focus:border-fuchsia-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-100 transition-all"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-[15px] text-gray-800 placeholder:text-gray-400 focus:border-fuchsia-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-100 transition-all"
            />
          </div>
          <div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              required
              className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-[15px] text-gray-800 placeholder:text-gray-400 focus:border-fuchsia-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-100 transition-all"
            />
          </div>
          <p className="text-xs text-gray-400 -mt-2">
            Password must be at least 6 characters
          </p>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-gray-900 px-4 text-[15px] font-semibold uppercase tracking-wide text-fuchsia-400 shadow-lg shadow-gray-900/20 transition hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <div className="my-7 flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
            or continue with
          </span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="flex justify-center gap-3">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow"
            aria-label="Sign up with Google"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow"
            aria-label="Sign up with Apple"
          >
            <svg className="h-5 w-5 text-gray-800" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow"
            aria-label="Sign up with Facebook"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="font-semibold text-fuchsia-500 hover:text-fuchsia-600 transition-colors"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen min-h-[100dvh] items-center justify-center overflow-hidden bg-white">
          <div className="relative flex flex-col items-center gap-4">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-gray-300 border-t-fuchsia-500" />
            <p className="text-sm text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <SignupPageInner />
    </Suspense>
  );
}
