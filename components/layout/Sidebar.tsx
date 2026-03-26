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
  Briefcase,
  Building2,
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
  roles?: Array<"super_admin" | "admin" | "client" | "user" | "location_manager">;
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
  // Analytics
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ["admin", "client"],
    moduleKey: "analytics",
  },
  {
    label: "Arena Analytics",
    href: "/dashboard/arena/analytics",
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ["admin", "client"],
    moduleKey: "arena-analytics",
  },
  {
    label: "Gaming Zone Analytics",
    href: "/dashboard/gaming-zone/analytics",
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ["admin", "client"],
    moduleKey: "gaming-zone-analytics",
  },

  // Bookings
  {
    label: "Bookings",
    href: "/dashboard/bookings",
    icon: <Calendar className="h-5 w-5" />,
    roles: ["admin", "client", "location_manager"],
    moduleKey: "bookings",
  },
  {
    label: "Arena Bookings",
    href: "/dashboard/arena/bookings",
    icon: <Calendar className="h-5 w-5" />,
    roles: ["admin", "client", "location_manager"],
    moduleKey: "arena-bookings",
  },
  {
    label: "Gaming Zone Bookings",
    href: "/dashboard/gaming-zone/bookings",
    icon: <Calendar className="h-5 w-5" />,
    roles: ["admin", "client", "location_manager"],
    moduleKey: "gaming-zone-bookings",
  },

  // Ledger
  {
    label: "Ledger",
    href: "/dashboard/ledger",
    icon: <Table2 className="h-5 w-5" />,
    roles: ["client", "location_manager"],
    moduleKey: "ledger",
  },
  {
    label: "Arena Ledger",
    href: "/dashboard/arena/ledger",
    icon: <Table2 className="h-5 w-5" />,
    roles: ["client", "location_manager"],
    moduleKey: "arena-ledger",
  },
  {
    label: "Gaming Zone Ledger",
    href: "/dashboard/gaming-zone/ledger",
    icon: <Table2 className="h-5 w-5" />,
    roles: ["client", "location_manager"],
    moduleKey: "gaming-zone-ledger",
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
    label: "Locations",
    href: "/dashboard/locations",
    icon: <MapPin className="h-5 w-5" />,
    roles: ["admin", "client", "location_manager"],
    moduleKey: "locations",
  },
  {
    label: "Facilities",
    href: "/dashboard/facilities",
    icon: <Building2 className="h-5 w-5" />,
    roles: ["client", "location_manager"],
    // No moduleKey yet so it's available to all client users;
    // can be module-gated later when backend exposes a facilities module key.
  },
  {
    label: "Games Setup",
    href: "/dashboard/facilities/games",
    icon: <Gamepad2 className="h-5 w-5" />,
    roles: ["client", "location_manager"],
  },
  {
    label: "Prices Setup",
    href: "/dashboard/facilities/prices",
    icon: <Activity className="h-5 w-5" />,
    roles: ["client", "location_manager"],
  },
  {
    label: "Packages Setup",
    href: "/dashboard/facilities/packages",
    icon: <CircleDot className="h-5 w-5" />,
    roles: ["client", "location_manager"],
  },
  {
    label: "Users",
    href: "/dashboard/users",
    icon: <Users className="h-5 w-5" />,
    roles: ["super_admin", "admin", "client"],
    moduleKey: "users",
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="h-5 w-5" />,
    roles: ["admin", "client", "user", "location_manager"],
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
      // No explicit assignment -> fall back to a minimal default for clients.
      // This prevents all facility-type (arena/gaming) modules from showing up by default.
      if (user.role === "client") {
        return [
          "dashboard-overview",
          "analytics",
          "bookings",
          "ledger",
          "locations",
          "users",
          "settings",
        ];
      }
      return null;
    }
    const modules = user.modules.filter(Boolean) as DashboardModuleKey[];
    // Dashboard should always be visible when modules are explicitly configured.
    if (!modules.includes("dashboard-overview")) {
      modules.unshift("dashboard-overview");
    }
    return modules;
  }, [user]);

  const visibleNavItems = useMemo(() => {
    if (!user) return navItems;

    return navItems;
  }, [user]);

  const clientBottomLabels = [
    "Locations",
    "Facilities",
    "Games Setup",
    "Prices Setup",
    "Packages Setup",
    "Settings",
  ];
  const { topItems, bottomItems } = useMemo(() => {
    if (!user || user.role !== "client") {
      return { topItems: visibleNavItems, bottomItems: [] as NavItem[] };
    }
    const top = visibleNavItems.filter((item) => !clientBottomLabels.includes(item.label));
    const bottom = visibleNavItems.filter((item) => clientBottomLabels.includes(item.label));
    return { topItems: top, bottomItems: bottom };
  }, [user, visibleNavItems]);

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

          {/* Navigation (top items; scrollable for client) */}
          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <ul className="space-y-1">
              {topItems.map((item) => {
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

          {/* Bottom nav: Locations, Facilities, Settings (client dashboard only) */}
          {bottomItems.length > 0 && (
            <div className="border-t border-border px-4 py-4">
              <ul className="space-y-1">
                {bottomItems.map((item) => {
                  const isActive = pathname === item.href;
                  const isSuperAdmin = user?.role === "super_admin";
                  if (!isSuperAdmin && item.roles && user && !item.roles.includes(user.role)) return null;
                  if (
                    !isSuperAdmin &&
                    effectiveModules &&
                    item.moduleKey &&
                    !effectiveModules.includes(item.moduleKey)
                  )
                    return null;
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
            </div>
          )}

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
