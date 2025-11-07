/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import {
LayoutDashboard,
Users,
FileText,
Settings,
LogOut,
ChevronLeft,
ChevronRight,
} from "lucide-react";

type SidebarProps = {
onSignOut?: () => void;
};

export default function Sidebar({ onSignOut }: SidebarProps) {
const [isCollapsed, setIsCollapsed] = useState(false);

const mainItems = [
{ icon: LayoutDashboard, label: "Dashboard", active: false },
{ icon: Users, label: "Users", active: true },
{ icon: FileText, label: "Quiz Sets", active: false },
{ icon: Settings, label: "Settings", active: false },
];

// Sign out is handled separately so it can sit at the bottom of the nav
const signOutItem = {
icon: LogOut,
label: "Sign Out",
onClick: onSignOut,
danger: true,
};

return (
<aside
    className={`${
    isCollapsed ? "w-20" : "w-72"
    } bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out h-screen sticky top-0`}
    aria-label="Sidebar"
>
    {/* Header / Brand */}
    <div className="h-20 flex items-center justify-between border-b border-gray-200 px-4">
    <div
        className={`flex items-center gap-3 ${
        isCollapsed ? "justify-center w-full" : ""
        }`}
    >
        <div className="w-11 h-11 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
        <span className="text-white font-bold text-base">EQ</span>
        </div>

        {!isCollapsed && (
        <span className="font-semibold text-gray-900 text-lg">
            Engliquest
        </span>
        )}
    </div>
    </div>

    {/* Navigation: top items + bottom sign out */}
    <nav
    className="flex-1 px-3 py-6 overflow-y-auto flex flex-col justify-between"
    aria-label="Main navigation"
    >
    {/* Top items */}
    <div className="space-y-3">
        {mainItems.map((item, index) => {
        const Icon = item.icon as any;
        const baseBtn =
            "group w-full flex items-center transition-all duration-200 rounded-lg focus:outline-none";

        const stateClasses = item.active
            ? "bg-indigo-50 text-indigo-600"
            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900";

        return (
            <button
            key={index}
            className={`${baseBtn} ${
                isCollapsed ? "justify-center" : "justify-start"
            } px-3 py-2 ${stateClasses}`}
            aria-label={item.label}
            title={isCollapsed ? item.label : undefined}
            >
            {/* Icon box (no colored background) */}
            <div
                className={`flex items-center justify-center shrink-0 w-12 h-12 rounded-lg transition-all duration-200`}
            >
                <Icon
                className={`${
                    item.active
                    ? "text-indigo-600"
                    : "text-gray-500 group-hover:text-gray-800"
                }`}
                size={20}
                />
            </div>

            {!isCollapsed && (
                <span className="ml-4 text-sm font-medium">{item.label}</span>
            )}
            </button>
        );
        })}
    </div>

    {/* Bottom area (keeps a clear separation from top links) */}
    <div>
        <div className="pt-3 border-t border-transparent"></div>

        {/* Sign Out (pushed to bottom but still inside nav) */}
        <div className="mt-4">
        <button
            onClick={signOutItem.onClick}
            className={`group w-full flex items-center ${
            isCollapsed ? "justify-center" : "justify-start"
            } px-3 py-2 rounded-lg transition-all duration-200 text-red-600 hover:bg-red-50`}
            aria-label={signOutItem.label}
            title={isCollapsed ? signOutItem.label : undefined}
        >
            <div className="flex items-center justify-center shrink-0 w-12 h-12 rounded-lg">
            <LogOut className="text-red-600" size={20} />
            </div>

            {!isCollapsed && (
            <span className="ml-4 text-sm font-medium">Sign Out</span>
            )}
        </button>
        </div>
    </div>
    </nav>

    {/* Collapse Toggle (outside nav, at very bottom) */}
    <div className="border-t border-gray-200 px-3 py-3">
    <button
        onClick={() => setIsCollapsed((s) => !s)}
        className={`group w-full flex items-center ${
        isCollapsed ? "justify-center" : "justify-start"
        } gap-3 px-2 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-all duration-200`}
    >
        {isCollapsed ? (
        <ChevronRight className="h-5 w-5" />
        ) : (
        <>
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Collapse</span>
        </>
        )}
    </button>
    </div>
</aside>
);
}
