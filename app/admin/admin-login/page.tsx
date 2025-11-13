/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/service/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col md:flex-row bg-white overflow-hidden">
      {/* Left Section - Illustration */}
      <section className="hidden md:flex w-1/2 items-center justify-center relative .bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src="/amico.png"
            alt="Illustration"
            width={600}
            height={600}
            className="object-contain opacity-95 pointer-events-none"
            priority
          />
        </div>
      </section>

      {/* Right Section - Login Form */}
      <section className="flex w-full md:w-1/2 items-center justify-center px-6 sm:px-12 lg:px-20 py-12 relative z-10">
        <div className="w-full max-w-md flex flex-col space-y-8">
          {/* Logo */}
          <div className="flex justify-start">
            <Image
              src="/Engliquest.png"
              alt="EngliQuest Logo"
              width={200}
              height={56}
              className="h-14 w-auto"
              priority
            />
          </div>

          {/* Header */}
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
              Hello, Welcome Back
            </h1>
            <p className="text-gray-600 text-base leading-relaxed">
              Your gateway to managing AI-generated quizzes safely and efficiently.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-6 pt-4">
            {/* Email Field */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">
                Email address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="h-12 rounded-lg border-gray-300 px-4 placeholder:text-gray-400 
                         focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                required
              />
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-12 rounded-lg border-gray-300 px-4 placeholder:text-gray-400 
                         focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                required
              />
              <div className="flex justify-end mt-1">
                <Link
                  href="/forgot-password"
                  className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base bg-indigo-600 hover:bg-indigo-700 text-white 
                       font-semibold rounded-lg transition-all shadow-sm hover:shadow-md 
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing In...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-sm text-gray-500 text-center pt-4">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}