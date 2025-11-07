"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/service/firebase";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
const router = useRouter();
const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
    setUser(firebaseUser);
    } else {
    router.push("/login");
    }
    setLoading(false);
});

return () => unsubscribe();
}, [router]);

const handleSignOut = async () => {
await signOut(auth);
router.push("/login");
};

if (loading) {
return (
    <main className="flex items-center justify-center min-h-screen">
    <p className="text-gray-500 text-lg">Loading dashboard...</p>
    </main>
);
}

if (!user) return null;

return (
<main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-6">
    <div className="bg-white shadow-md rounded-xl p-8 w-full max-w-md text-center space-y-6">
    <h1 className="text-3xl font-bold text-gray-900">
        Welcome to your Dashboard 🎉
    </h1>
    <p className="text-gray-600">
        You are signed in as:
        <br />
        <span className="font-medium text-gray-800">{user.email}</span>
    </p>

    <div className="pt-4">
        <Button
        onClick={handleSignOut}
        className="w-full h-11 text-base bg-[#8B8BF9] hover:bg-[#7575e0] text-white font-medium rounded-lg transition-all"
        >
        Sign Out
        </Button>
    </div>
    </div>
</main>
);
}
