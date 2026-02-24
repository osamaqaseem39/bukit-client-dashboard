"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  Gamepad2,
  MapPin,
  Calendar,
  CircleDot,
  Table2,
  Activity,
  Footprints,
  Crosshair,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardModuleKey } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  /**
   * Optional roles that are allowed to see this item.
   * If omitted, the item is available to all roles (subject to modules).
   */
  roles?: Array<"super_admin" | "admin" | "client" | "user">;
  /**
   * Optional dashboard module key required for this item.
   * If provided and the logged-in user has a non-empty modules list,
   * the item will only be shown when this key is present.
   */
  moduleKey?: DashboardModuleKey;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    moduleKey: "dashboard-overview",
  },
  {
    label: "Business Setup",
    href: "/dashboard/setup",
    icon: <Briefcase className="h-5 w-5" />,
    roles: ["admin"],
  },
  {
    label: "Businesses",
    href: "/dashboard/clients",
    icon: <Briefcase className="h-5 w-5" />,
    roles: ["admin"],
  },
  {
    label: "Gaming",
    href: "/dashboard/gaming",
    icon: <Gamepad2 className="h-5 w-5" />,
    roles: ["admin", "client"],
    moduleKey: "gaming",
  },
  {
    label: "Snooker",
    href: "/dashboard/snooker",
    icon: <CircleDot className="h-5 w-5" />,
    roles: ["admin", "client"],
    moduleKey: "snooker",
  },
  {
    label: "Table Tennis",
    href: "/dashboard/table-tennis",
    icon: <Table2 className="h-5 w-5" />,
    roles: ["admin", "client"],
    moduleKey: "table-tennis",
  },
  {
    label: "Cricket",
    href: "/dashboard/cricket",
    icon: <Activity className="h-5 w-5" />,
    roles: ["admin", "client"],
    moduleKey: "cricket",
  },
  {
    label: "Futsal Turf",
    href: "/dashboard/futsal-turf",
    icon: <Footprints className="h-5 w-5" />,
    roles: ["admin", "client"],
    moduleKey: "futsal-turf",
  },
  {
    label: "Padel",
    href: "/dashboard/padel",
    icon: <Crosshair className="h-5 w-5" />,
    roles: ["admin", "client"],
    moduleKey: "padel",
  },
  {
    label: "Locations",
    href: "/dashboard/locations",
    icon: <MapPin className="h-5 w-5" />,
    roles: ["admin", "client"],
    moduleKey: "locations",
  },
  {
    label: "Facilities",
    href: "/dashboard/facilities",
    icon: <CircleDot className="h-5 w-5" />,
    roles: ["client"],
    // No moduleKey yet so it's available to all client users;
    // can be module-gated later when backend exposes a facilities module key.
  },
  {
    label: "Users",
    href: "/dashboard/users",
    icon: <Users className="h-5 w-5" />,
    roles: ["super_admin", "admin", "client"],
    moduleKey: "users",
  },
  {
    label: "Bookings",
    href: "/dashboard/bookings",
    icon: <Calendar className="h-5 w-5" />,
    roles: ["admin", "client"],
    moduleKey: "bookings",
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ["admin", "client"],
    moduleKey: "analytics",
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="h-5 w-5" />,
    roles: ["admin", "client", "user"],
    moduleKey: "settings",
  },
];

export default function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const effectiveModules = useMemo<DashboardModuleKey[] | null>(() => {
    if (!user) return null;
    if (!user.modules || user.modules.length === 0) {
      // No explicit assignment -> fall back to role-based navigation
      return null;
    }
    return user.modules.filter(Boolean) as DashboardModuleKey[];
  }, [user]);

  const visibleNavItems = useMemo(() => {
    if (!user) return navItems;

    // For client dashboard users, only show core operational items.
    if (user.role === "client") {
      const allowedClientLabels = new Set([
        "Bookings",
        "Locations",
        "Facilities",
        "Settings",
      ]);
      return navItems.filter((item) => allowedClientLabels.has(item.label));
    }

    // For other roles (admin, super_admin, user) keep existing behavior.
    return navItems;
  }, [user]);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed left-4 top-4 z-50 lg:hidden rounded-lg border border-border bg-surface p-2 shadow-md"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && !isDesktop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-64 border-r border-border bg-surface shadow-lg transition-transform duration-200",
          "lg:translate-x-0 lg:static lg:z-auto",
          !isDesktop && !isMobileOpen && "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-border px-6">
            <h1 className="text-xl font-bold text-primary">Client Dashboard</h1>
            {user && (
              <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                {user.role}
              </span>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <ul className="space-y-1">
              {visibleNavItems.map((item) => {
                const isActive = pathname === item.href;

                // Super admin can see everything
                const isSuperAdmin = user?.role === "super_admin";

                // Role-based restriction (still enforced, except for super admin)
                if (!isSuperAdmin && item.roles && user && !item.roles.includes(user.role)) {
                  return null;
                }

                // Module-based restriction (only when user has explicit modules, super admin bypasses)
                if (
                  !isSuperAdmin &&
                  effectiveModules &&
                  item.moduleKey &&
                  !effectiveModules.includes(item.moduleKey)
                ) {
                  return null;
                }

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-white"
                          : "text-text-secondary hover:bg-[rgb(var(--bg))] hover:text-text-primary"
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="border-t border-border p-4">
            <p className="text-xs text-text-secondary">
              © 2026 Client Dashboard
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
