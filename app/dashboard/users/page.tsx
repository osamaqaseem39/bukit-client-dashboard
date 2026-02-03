"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckSquare, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  AdminUserSummary,
  DashboardModuleKey,
  getUsersApi,
  updateUserModulesApi,
} from "@/lib/api";

const ALL_MODULES: { key: DashboardModuleKey; label: string }[] = [
  { key: "dashboard-overview", label: "Dashboard overview" },
  { key: "gaming", label: "Gaming" },
  { key: "snooker", label: "Snooker" },
  { key: "table-tennis", label: "Table Tennis" },
  { key: "cricket", label: "Cricket" },
  { key: "futsal-turf", label: "Futsal Turf" },
  { key: "padel", label: "Padel" },
  { key: "locations", label: "Locations" },
  { key: "users", label: "Users" },
  { key: "bookings", label: "Bookings" },
  { key: "analytics", label: "Analytics" },
  { key: "settings", label: "Settings" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    getUsersApi()
      .then((data) => {
        if (!isMounted) return;
        setUsers(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Failed to load users");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const totalUsers = users.length;
  const admins = users.filter((u) => u.role === "admin").length;
  const clients = users.filter((u) => u.role === "client").length;

  async function handleToggleModule(
    user: AdminUserSummary,
    moduleKey: DashboardModuleKey
  ) {
    const currentModules = user.modules && user.modules.length > 0
      ? new Set<DashboardModuleKey>(user.modules)
      : new Set<DashboardModuleKey>();

    if (currentModules.has(moduleKey)) {
      currentModules.delete(moduleKey);
    } else {
      currentModules.add(moduleKey);
    }

    const nextModules =
      currentModules.size === 0 ? null : Array.from(currentModules);

    setSavingUserId(user.id);
    setError(null);

    try {
      const updated = await updateUserModulesApi(user.id, nextModules);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? updated : u))
      );
    } catch (err: any) {
      setError(err.message || "Failed to update modules");
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Users</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage users and configure which dashboard modules each user can access.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            // Simple manual refresh
            window.location.reload();
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-border-primary px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface-elevated/60 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">
                  Total Users
                </p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {loading ? "—" : totalUsers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">
                  Admins
                </p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {loading ? "—" : admins}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">
                  Clients
                </p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {loading ? "—" : clients}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error / Loading */}
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Users Table with module assignment */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-text-primary">
            All Users & Modules
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Toggle modules to control which dashboard sections each user can see.
            When a user has no modules, the dashboard falls back to role-based defaults.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-text-secondary">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-secondary">
              No users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="min-w-[360px]">
                      Modules
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const activeModules = new Set(
                      user.modules?.filter(Boolean) ?? []
                    );

                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.name}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="capitalize">
                          <span className="inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {ALL_MODULES.map((mod) => {
                              const checked = activeModules.has(mod.key);
                              const disabled = savingUserId === user.id;

                              return (
                                <button
                                  key={mod.key}
                                  type="button"
                                  disabled={disabled}
                                  onClick={() =>
                                    handleToggleModule(user, mod.key)
                                  }
                                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium transition-colors ${
                                    checked
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border-primary bg-surface-elevated/60 text-text-secondary hover:border-primary/60 hover:text-text-primary"
                                  } ${
                                    disabled ? "opacity-60 cursor-not-allowed" : ""
                                  }`}
                                >
                                  <CheckSquare
                                    className={`h-3 w-3 ${
                                      checked
                                        ? "text-primary"
                                        : "text-text-secondary"
                                    }`}
                                  />
                                  {mod.label}
                                </button>
                              );
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
