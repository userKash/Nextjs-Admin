"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { BarChart3, Users, LogOut, BookOpen, Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import { auth, db } from "@/service/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

interface AdminUser {
  name: string;
  email: string;
  initials: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Fetch logged-in admin user data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const name = userData.name || user.displayName || "Admin User";
            const email = userData.email || user.email || "admin@engliquest.com";
            const initials = name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .substring(0, 2);
            
            setAdminUser({ name, email, initials });
          } else {
            // Fallback to auth data
            const name = user.displayName || "Admin";
            const email = user.email || "admin@engliquest.com";
            const initials = name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .substring(0, 2);
            
            setAdminUser({ name, email, initials });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          // Fallback to auth data
          const name = user.displayName || "Admin";
          const email = user.email || "admin@engliquest.com";
          const initials = name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2);
          
          setAdminUser({ name, email, initials });
        }
      } else {
        // Redirect to login if not authenticated
        router.push("/admin/admin-login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      try {
        await signOut(auth);
        router.push("/admin/admin-login");
      } catch (error) {
        console.error("Error logging out:", error);
        alert("Failed to logout. Please try again.");
      }
    }
  };

  const handleNavigation = (href: string) => {
    setIsSidebarOpen(false);
    router.push(href);
  };

  const navigationItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: BarChart3,
      href: "/admin/dashboard",
    },
    {
      id: "users",
      label: "Users & Quiz Management",
      icon: Users,
      href: "/admin/dashboard/users-quiz",
    },
  ];

  // Determine active tab based on pathname
  const getActiveTab = () => {
    if (pathname?.includes("/users-quiz")) return "users";
    return "dashboard";
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#5E67CC] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          bg-white border-r border-gray-200
          transform transition-all duration-300 ease-in-out
          flex flex-col
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isMinimized ? "lg:w-20" : "lg:w-64"}
        `}
        style={{ width: isSidebarOpen ? "256px" : undefined }}
      >
        {/* Logo/Brand */}
        <div className="px-4 py-5 border-b border-gray-200 flex items-center justify-between flex-shrink:0">
          {!isMinimized ? (
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 bg-[#5E67CC] rounded-lg flex items-center justify-center flex-shrink:0">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-bold text-gray-900 truncate">Engliquest</h1>
                <p className="text-xs text-gray-500 truncate">Admin Dashboard</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 bg-[#5E67CC] rounded-lg flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          )}
          
          {/* Close button for mobile */}
          <button
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink:0"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4 space-y-1 overflow-y-auto flex-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = getActiveTab() === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.href)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                  font-medium transition-all duration-200 text-sm
                  ${isActive ? "bg-[#5E67CC] text-white shadow-sm" : "text-gray-700 hover:bg-gray-100"}
                  ${isMinimized ? "justify-center" : ""}
                `}
                title={isMinimized ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink:0" />
                {!isMinimized && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Minimize Toggle (Desktop Only) */}
        <div className="hidden lg:flex px-3 py-2 border-t border-gray-200 flex-shrink:0">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="w-full flex items-center justify-center px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={isMinimized ? "Expand sidebar" : "Minimize sidebar"}
            aria-label={isMinimized ? "Expand sidebar" : "Minimize sidebar"}
          >
            {isMinimized ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* User Info & Logout */}
        <div className="px-3 py-4 border-t border-gray-200 space-y-2 flex-shrink:0">
          {/* User Info */}
          {!isMinimized ? (
            <div className="px-3 py-2.5 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#5E67CC]/10 rounded-full flex items-center justify-center flex-shrink:0">
                  <span className="text-[#5E67CC] font-semibold text-xs">
                    {adminUser?.initials || "AD"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-xs truncate">
                    {adminUser?.name || "Admin User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {adminUser?.email || "admin@engliquest.com"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-9 h-9 bg-[#5E67CC]/10 rounded-full flex items-center justify-center">
                <span className="text-[#5E67CC] font-semibold text-xs">
                  {adminUser?.initials || "AD"}
                </span>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
              text-red-600 hover:bg-red-50 font-medium transition-all duration-200 text-sm
              ${isMinimized ? "justify-center" : ""}
            `}
            title={isMinimized ? "Logout" : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink:0" />
            {!isMinimized && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex-shrink:0">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#5E67CC] rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900">Engliquest</span>
            </div>
            <div className="w-10"></div>
          </div>
        </header>

        {/* Page Content - Scrollable */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}