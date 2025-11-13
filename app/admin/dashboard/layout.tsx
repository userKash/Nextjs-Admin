"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Users, LogOut, BookOpen, Menu, X } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const router = useRouter(); // <- Next.js router

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      // Handle logout logic here
      alert("Logging out...");
    }
  };

  const handleNavigation = (tabId: string, href: string) => {
    setActiveTab(tabId);
    setIsSidebarOpen(false);
    router.push(href); // <- Navigate to the target route
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

  return (
    <div
      className="bg-gray-50 flex"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        style={{
          width: "256px",
          flexShrink: 0,
          height: "100vh",
        }}
      >
        <div className="flex flex-col" style={{ height: "100%", minHeight: 0 }}>
          {/* Logo/Brand */}
          <div className="px-6 py-6 border-b border-gray-200" style={{ flexShrink: 0 }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink: 0">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Engliquest</h1>
                  <p className="text-xs text-gray-500">Admin Dashboard</p>
                </div>
              </div>
              <button
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="px-4 py-6 space-y-2 overflow-y-auto" style={{ flex: 1, minHeight: 0 }}>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id, item.href)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg
                    font-medium transition-all duration-200 text-sm
                    ${isActive ? "bg-indigo-600 text-white shadow-sm" : "text-gray-700 hover:bg-gray-100"}
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink: 0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="px-4 py-4 border-t border-gray-200 space-y-3" style={{ flexShrink: 0 }}>
            <div className="px-4 py-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink: 0">
                  <span className="text-indigo-600 font-semibold text-sm">AD</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">Admin User</p>
                  <p className="text-xs text-gray-500 truncate">admin@engliquest.com</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg
                       text-red-600 hover:bg-red-50 font-medium transition-all duration-200 text-sm"
            >
              <LogOut className="w-5 h-5 flex-shrink: 0" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className="flex flex-col"
        style={{
          flex: 1,
          minWidth: 0,
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-4" style={{ flexShrink: 0 }}>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900">Engliquest</span>
            </div>
            <div className="w-10"></div>
          </div>
        </header>

        {/* Page Content */}
        <main
          className="bg-gray-50"
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            minHeight: 0,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
