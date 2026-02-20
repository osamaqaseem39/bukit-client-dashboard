"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckSquare, Loader2, RefreshCw, Plus, Pencil, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import {
  AdminUserSummary,
  DashboardModuleKey,
  getUsersApi,
  updateUserModulesApi,
  createUserApi,
  updateUserRoleApi,
  CreateUserPayload,
  UpdateUserRolePayload,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

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

const ROLES: { value: "super_admin" | "admin" | "client" | "user"; label: string }[] = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "client", label: "Client Admin" },
  { value: "user", label: "User" },
];

export default function UsersPage() {
  const { user: currentUser, isSuperAdmin, isAdmin, isClient } = useAuth();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserSummary | null>(null);
  const [createForm, setCreateForm] = useState<CreateUserPayload>({
    name: "",
    email: "",
    password: "",
    role: "user",
  });
  const [editForm, setEditForm] = useState<UpdateUserRolePayload>({
    role: undefined,
    modules: null,
  });

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
  const superAdmins = users.filter((u) => u.role === "super_admin").length;
  const admins = users.filter((u) => u.role === "admin").length;
  const clients = users.filter((u) => u.role === "client").length;
  const regularUsers = users.filter((u) => u.role === "user").length;

  // Client admin can only create users, not admins
  const canCreateUsers = isSuperAdmin() || isAdmin() || isClient();
  const availableRoles = isSuperAdmin()
    ? ROLES
    : isAdmin()
    ? ROLES.filter((r) => r.value !== "super_admin")
    : isClient()
    ? ROLES.filter((r) => r.value !== "super_admin" && r.value !== "admin")
    : [];

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

  async function handleCreateUser() {
    if (!createForm.name || !createForm.email || !createForm.password) {
      setError("Name, email, and password are required");
      return;
    }

    setSavingUserId("new");
    setError(null);

    try {
      const newUser = await createUserApi(createForm);
      setUsers((prev) => [...prev, newUser]);
      setIsCreateModalOpen(false);
      setCreateForm({ name: "", email: "", password: "", role: "user" });
    } catch (err: any) {
      setError(err.message || "Failed to create user");
    } finally {
      setSavingUserId(null);
    }
  }

  function openEditModal(user: AdminUserSummary) {
    setEditingUser(user);
    setEditForm({
      role: user.role,
      modules: user.modules || null,
    });
  }

  function closeEditModal() {
    setEditingUser(null);
    setEditForm({ role: undefined, modules: null });
  }

  async function handleUpdateRole() {
    if (!editingUser) return;

    setSavingUserId(editingUser.id);
    setError(null);

    try {
      const updated = await updateUserRoleApi(editingUser.id, editForm);
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? updated : u))
      );
      closeEditModal();
    } catch (err: any) {
      setError(err.message || "Failed to update user");
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
            {isSuperAdmin()
              ? "Manage all users and configure roles and permissions."
              : isClient()
              ? "Manage users in your domain and configure their permissions."
              : "Manage users and configure which dashboard modules each user can access."}
          </p>
        </div>
        <div className="flex gap-2">
          {canCreateUsers && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          )}
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
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4">
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
        {isSuperAdmin() && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">
                    Super Admins
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-text-primary">
                    {loading ? "—" : superAdmins}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
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
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">
                  Regular Users
                </p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {loading ? "—" : regularUsers}
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
                    {isSuperAdmin() && <TableHead>Domain</TableHead>}
                    <TableHead className="min-w-[360px]">
                      Modules
                    </TableHead>
                    {canCreateUsers && <TableHead>Actions</TableHead>}
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
                            {user.role.replace("_", " ")}
                          </span>
                        </TableCell>
                        {isSuperAdmin() && (
                          <TableCell className="text-sm text-text-secondary">
                            {user.client_id ? "Client Domain" : "Platform"}
                          </TableCell>
                        )}
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
                        {canCreateUsers && (
                          <TableCell>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openEditModal(user)}
                              disabled={savingUserId === user.id}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create User"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Name *"
            value={createForm.name}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="John Doe"
          />
          <Input
            label="Email *"
            type="email"
            value={createForm.email}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="john@example.com"
          />
          <Input
            label="Password *"
            type="password"
            value={createForm.password}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, password: e.target.value }))
            }
            placeholder="Minimum 6 characters"
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Role
            </label>
            <select
              value={createForm.role}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  role: e.target.value as any,
                }))
              }
              className="w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {availableRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={savingUserId === "new"}
            >
              {savingUserId === "new" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={closeEditModal}
        title={`Edit User: ${editingUser?.name}`}
        size="lg"
      >
        {editingUser && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Role
              </label>
              <select
                value={editForm.role || editingUser.role}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    role: e.target.value as any,
                  }))
                }
                className="w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {availableRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Modules
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_MODULES.map((mod) => {
                  const checked =
                    editForm.modules?.includes(mod.key) ?? false;
                  return (
                    <button
                      key={mod.key}
                      type="button"
                      onClick={() => {
                        const current = editForm.modules || [];
                        const updated = checked
                          ? current.filter((m) => m !== mod.key)
                          : [...current, mod.key];
                        setEditForm((prev) => ({
                          ...prev,
                          modules: updated.length > 0 ? updated : null,
                        }));
                      }}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium transition-colors ${
                        checked
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border-primary bg-surface-elevated/60 text-text-secondary hover:border-primary/60"
                      }`}
                    >
                      <CheckSquare className="h-3 w-3" />
                      {mod.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={closeEditModal}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateRole}
                disabled={savingUserId === editingUser.id}
              >
                {savingUserId === editingUser.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
