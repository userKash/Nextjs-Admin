    "use client";
    import Image from "next/image";
    import Link from "next/link";
    import { Button } from "@/components/ui/button";
    import { Input } from "@/components/ui/input";

    export default function LoginPage() {
    return (
        <main className="relative flex min-h-screen flex-col md:flex-row bg-white overflow-hidden">
        <section className="hidden md:flex w-1/2 items-center justify-center relative">
            <div className="absolute top-0 left-0 bottom-0 right-[-100px]">
            <Image
                src="/amico.png"
                alt="Illustration"
                fill
                className="object-cover object-left opacity-95 pointer-events-none"
                priority
            />
            </div>
        </section>
        <section className="flex w-full md:w-1/2 items-center justify-center px-10 sm:px-16 lg:px-28 py-28 relative z-10">
            <div className="w-full max-w-md flex flex-col justify-between space-y-14">
            <div className="flex justify-start">
                <Image
                src="/Engliquest.png"
                alt="EngliQuest Logo"
                width={180}
                height={50}
                className="h-10 w-auto"
                priority
                />
            </div>
            <div className="space-y-6">
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight leading-snug">
                Hello, Welcome Back
                </h1>
                <p className="text-gray-600 text-base leading-relaxed max-w-sm">
                Your gateway to managing AI-generated quizzes safely and efficiently.
                </p>
            </div>
            <form className="flex flex-col gap-4 pt-2">
                <div className="flex flex-col gap-4">
                <label className="text-sm font-semibold text-gray-700">
                    Email address
                </label>
                <Input
                type="email"
                placeholder="Enter your email"
                className="h-12 rounded-lg border-gray-300 !px-3 placeholder:text-gray-400 focus:border-[#8B8BF9] focus:ring-[#8B8BF9]/30 transition-all"
                />
                </div>
                <div className="flex flex-col gap-4">
                <label className="text-sm font-semibold text-gray-700">
                    Password
                </label>
                <Input
                type="password"
                placeholder="Enter your password"
                className="h-12 rounded-lg border-gray-300 !px-3 placeholder:text-gray-400 focus:border-[#8B8BF9] focus:ring-[#8B8BF9]/30 transition-all"
                />
                <div className="flex justify-end pt-1">
                    <Link
                    href="/forgot-password"
                    className="text-sm text-gray-500 hover:text-[#8B8BF9] transition-colors"
                    >
                    Forgot password?
                    </Link>
                </div>
                </div>
                <div className="pt-2">
                <Button
                    type="submit"
                    className="w-full h-12 text-base bg-[#8B8BF9] hover:bg-[#7575e0] text-white font-medium rounded-lg transition-all"
                >
                    Sign In
                </Button>
                </div>
            </form>
            <p className="text-sm text-gray-500 text-center pt-6 leading-relaxed">
                Don’t have an account?{" "}
                <Link
                href="/register"
                className="text-[#8B8BF9] font-semibold hover:underline"
                >
                Sign up
                </Link>
            </p>
            </div>
        </section>
        </main>
    );
    }