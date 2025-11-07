    "use client";

    import { useState } from "react";
    import { useRouter } from "next/navigation";
    import { ChevronRight } from "lucide-react";
    import Sidebar from "@/components/navbar";

    type UserData = {
    id: number;
    name: string;
    email: string;
    interests: string[];
    quizSets: string;
    status: "approved" | "pending" | "partial";
    created: string;
    };

    const mockUsers: UserData[] = [
    {
        id: 1,
        name: "Maria Santos",
        email: "maria@example.com",
        interests: ["Adventure Stories", "Filipino Culture", "+1"],
        quizSets: "30/30",
        status: "approved",
        created: "2024-10-15",
    },
    {
        id: 2,
        name: "Juan Dela Cruz",
        email: "juan@example.com",
        interests: ["Sports & Games", "Friendship", "+1"],
        quizSets: "0/30",
        status: "pending",
        created: "2024-11-04",
    },
    {
        id: 3,
        name: "Sofia Reyes",
        email: "sofia@example.com",
        interests: ["Fantasy & Magic", "Family Values", "+1"],
        quizSets: "15/30",
        status: "partial",
        created: "2024-11-01",
    },
    {
        id: 4,
        name: "Carlos Rivera",
        email: "carlos@example.com",
        interests: ["Nature & Animals", "Sports & Games", "+1"],
        quizSets: "30/30",
        status: "approved",
        created: "2024-10-28",
    },
    ];

    export default function DashboardPage() {
    const [filter, setFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter(); // ✅ Needed for client-side navigation

    const filteredUsers = mockUsers.filter((u) => {
        const matchesFilter = filter === "all" || u.status === filter;
        const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
        case "approved":
            return (
            <div className="inline-flex items-center gap-1.5 text-green-600 text-sm">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9 12l2 2 4-4" />
                </svg>
                <span className="font-medium">All Approved</span>
            </div>
            );
        case "pending":
            return (
            <div className="inline-flex items-center gap-1.5 text-orange-600 text-sm">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
                </svg>
                <span className="font-medium">Pending Review</span>
            </div>
            );
        case "partial":
            return (
            <div className="inline-flex items-center gap-1.5 text-yellow-600 text-sm">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span className="font-medium">Partially Approved</span>
            </div>
            );
        default:
            return null;
        }
    };

    // ✅ Proper sign-out redirect
    const handleSignOut = () => {
        console.log("Signing out...");
        // perform logout cleanup here if needed (clear cookies, tokens, etc.)
        router.push("/auth/login");
    };

    return (
        <div className="flex min-h-screen bg-white">
        <Sidebar onSignOut={handleSignOut} />

        <main className="flex-1">
            <div className="px-8 py-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                Users & Quiz Management
                </h1>
                <p className="text-sm text-gray-500 mb-4">
                Manage users and approve quiz sets
                </p>

                <div className="mb-3">
                <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full max-w-md border-0 border-b border-gray-300 px-0 py-1.5 text-sm focus:ring-0 focus:border-indigo-600 outline-none placeholder:text-gray-400"
                />
                </div>

                <div className="flex items-center gap-2 border-b border-gray-200">
                {[
                    { key: "all", label: "All" },
                    { key: "pending", label: "Pending" },
                    { key: "partial", label: "Partial" },
                    { key: "approved", label: "Approved" },
                ].map((tab) => (
                    <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                        filter === tab.key
                        ? "text-indigo-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                    >
                    {tab.label}
                    {filter === tab.key && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
                    )}
                    </button>
                ))}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Interests
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Quiz Sets
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Created
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                        Actions
                    </th>
                    </tr>
                </thead>
                <tbody>
                    {filteredUsers.map((u, idx) => (
                    <tr
                        key={u.id}
                        className={`border-b border-gray-100 ${
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                    >
                        <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 text-sm">
                            {u.name}
                        </div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                            {u.interests.map((interest, i) => (
                            <span key={i} className="text-indigo-600 text-sm">
                                {interest}
                            </span>
                            ))}
                        </div>
                        </td>
                        <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 text-sm">
                            {u.quizSets}
                        </div>
                        <div className="text-xs text-gray-500">{u.status}</div>
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(u.status)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                        {u.created}
                        </td>
                        <td className="px-4 py-3 text-right">
                        <button className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors">
                            View Details
                            <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
            </div>
        </main>
        </div>
    );
}
