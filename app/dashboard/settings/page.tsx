"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Save, Loader2, Shield, Users, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  getClientByUserIdApi,
  updateClientApi,
  UpdateClientPayload,
  ClientDetail,
  DashboardModuleKey,
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

export default function SettingsPage() {
  const { user, isClient, isSuperAdmin, isAdmin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [clientData, setClientData] = useState<ClientDetail | null>(null);

  const [formData, setFormData] = useState<UpdateClientPayload>({
    company_name: "",
    contact_name: null,
    email: null,
    phone: null,
    address: null,
    city: null,
    state: null,
    country: null,
    postal_code: null,
    tax_id: null,
    company_registration_number: null,
    description: null,
    logo_url: null,
    cover_image_url: null,
    latitude: null,
    longitude: null,
  });

  useEffect(() => {
    if (isClient() && user) {
      loadClientData();
    } else {
      setLoading(false);
    }
  }, [user, isClient]);

  async function loadClientData() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getClientByUserIdApi(user.id);
      setClientData(data);
      setFormData({
        company_name: data.company_name || "",
        contact_name: data.contact_name || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        postal_code: data.postal_code || null,
        tax_id: data.tax_id || null,
        company_registration_number: data.company_registration_number || null,
        description: data.description || null,
        logo_url: data.logo_url || null,
        cover_image_url: data.cover_image_url || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
      });
    } catch (err: any) {
      setError(err.message || "Failed to load business information");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!clientData) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateClientApi(clientData.id, formData);
      setSuccess(true);
      await loadClientData();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update business information");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {isClient()
            ? "Manage your business information and account settings"
            : "Manage your account settings and preferences"}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-success/40 bg-success/5 px-4 py-3 text-sm text-success">
          Business information updated successfully!
        </div>
      )}

      {/* Business Information - Only for clients */}
      {isClient() && clientData && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-text-primary">
              Business Information
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Update your business profile and contact details
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Company Name *"
                value={formData.company_name || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    company_name: e.target.value,
                  }))
                }
              />
              <Input
                label="Contact Name"
                value={formData.contact_name || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contact_name: e.target.value || null,
                  }))
                }
              />
              <Input
                label="Email"
                type="email"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    email: e.target.value || null,
                  }))
                }
              />
              <Input
                label="Phone"
                type="tel"
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    phone: e.target.value || null,
                  }))
                }
              />
              <Input
                label="Tax ID"
                value={formData.tax_id || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    tax_id: e.target.value || null,
                  }))
                }
              />
              <Input
                label="Registration Number"
                value={formData.company_registration_number || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    company_registration_number: e.target.value || null,
                  }))
                }
              />
            </div>
            <Input
              label="Address"
              value={formData.address || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  address: e.target.value || null,
                }))
              }
            />
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="City"
                value={formData.city || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    city: e.target.value || null,
                  }))
                }
              />
              <Input
                label="State"
                value={formData.state || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    state: e.target.value || null,
                  }))
                }
              />
              <Input
                label="Country"
                value={formData.country || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    country: e.target.value || null,
                  }))
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Postal Code"
                value={formData.postal_code || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    postal_code: e.target.value || null,
                  }))
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Logo URL"
                type="url"
                value={formData.logo_url || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    logo_url: e.target.value || null,
                  }))
                }
              />
              <Input
                label="Cover Image URL"
                type="url"
                value={formData.cover_image_url || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    cover_image_url: e.target.value || null,
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-text-primary">
                Description
              </label>
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                rows={4}
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value || null,
                  }))
                }
                placeholder="Business description..."
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Settings - For all users */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-text-primary">
            Account Settings
          </h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Input
            label="Name"
            defaultValue={user?.name || ""}
            disabled
            className="opacity-60"
          />
          <Input
            label="Email"
            type="email"
            defaultValue={user?.email || ""}
            disabled
            className="opacity-60"
          />
          <p className="text-xs text-text-secondary">
            To change your account email or name, please contact support.
          </p>
        </CardContent>
      </Card>

      {/* Roles & Permissions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-text-primary flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Roles & Permissions
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {isSuperAdmin()
                  ? "You have full platform access as Super Admin"
                  : isAdmin()
                  ? "You have administrative access"
                  : isClient()
                  ? "You are a Client Admin managing your domain"
                  : "Your current role and permissions"}
              </p>
            </div>
            {(isSuperAdmin() || isAdmin() || isClient()) && (
              <Button
                variant="secondary"
                onClick={() => router.push("/dashboard/users")}
              >
                Manage Users
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Your Role
            </label>
            <div className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {user?.role?.replace("_", " ").toUpperCase() || "USER"}
            </div>
            {user?.client_id && (
              <p className="mt-2 text-xs text-text-secondary">
                Domain: {user.client_id === user.id ? "Own Domain" : "Client Domain"}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Dashboard Modules Access
            </label>
            <p className="text-xs text-text-secondary mb-3">
              {user?.modules && user.modules.length > 0
                ? "You have custom module access configured:"
                : "You are using role-based default modules:"}
            </p>
            <div className="flex flex-wrap gap-2">
              {user?.modules && user.modules.length > 0
                ? user.modules.map((moduleKey) => {
                    const module = ALL_MODULES.find((m) => m.key === moduleKey);
                    return module ? (
                      <span
                        key={moduleKey}
                        className="inline-flex rounded-full border border-primary bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                      >
                        {module.label}
                      </span>
                    ) : null;
                  })
                : ALL_MODULES.map((module) => {
                    // Show default modules based on role
                    const hasAccess =
                      (isSuperAdmin() || isAdmin()) ||
                      (isClient() &&
                        ["dashboard-overview", "bookings", "gaming", "locations", "settings"].includes(
                          module.key
                        )) ||
                      (!isSuperAdmin() &&
                        !isAdmin() &&
                        !isClient() &&
                        module.key === "dashboard-overview");
                    return hasAccess ? (
                      <span
                        key={module.key}
                        className="inline-flex rounded-full border border-border-primary bg-surface-elevated/60 px-2 py-1 text-xs font-medium text-text-secondary"
                      >
                        {module.label}
                      </span>
                    ) : null;
                  })}
            </div>
            {(isSuperAdmin() || isAdmin() || isClient()) && (
              <p className="mt-3 text-xs text-text-secondary">
                To modify user roles and permissions, visit the{" "}
                <button
                  onClick={() => router.push("/dashboard/users")}
                  className="text-primary hover:underline"
                >
                  Users Management
                </button>{" "}
                page.
              </p>
            )}
          </div>

          {isSuperAdmin() && (
            <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Super Admin Privileges
                  </p>
                  <p className="mt-1 text-xs text-yellow-700">
                    You have full access to all platform features, users, and settings.
                    You can manage all users, including other admins and super admins.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isClient() && (
            <div className="rounded-lg border border-blue-500/40 bg-blue-500/5 p-4">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Client Admin Privileges
                  </p>
                  <p className="mt-1 text-xs text-blue-700">
                    You can manage users in your domain and configure their permissions.
                    You cannot create admin users or access other client domains.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-text-primary">
            Notification Settings
          </h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">
                Email Notifications
              </p>
              <p className="text-xs text-text-secondary">
                Receive email updates about bookings and activities
              </p>
            </div>
            <input type="checkbox" className="h-4 w-4 rounded" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">
                SMS Notifications
              </p>
              <p className="text-xs text-text-secondary">
                Receive SMS updates for urgent matters
              </p>
            </div>
            <input type="checkbox" className="h-4 w-4 rounded" />
          </div>
          <div className="flex justify-end pt-4">
            <Button>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
