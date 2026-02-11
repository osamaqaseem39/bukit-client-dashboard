"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, MapPin, Pencil, Eye } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import type { ClientSummary, UpdateClientPayload } from "@/lib/api";
import { getClientsApi, updateClientApi } from "@/lib/api";

type ViewMode = "grid" | "list";

function formatStatus(status: ClientSummary["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusBadgeClasses(status: ClientSummary["status"]) {
  switch (status) {
    case "active":
    case "approved":
      return "bg-success/10 text-success";
    case "pending":
      return "bg-warning/10 text-warning";
    case "rejected":
    case "suspended":
      return "bg-error/10 text-error";
    default:
      return "bg-border text-text-secondary";
  }
}

export default function ClientsPage() {
  const router = useRouter();

  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const [editingClient, setEditingClient] = useState<ClientSummary | null>(null);
  const [editForm, setEditForm] = useState<UpdateClientPayload>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadClients() {
      setLoading(true);
      setError(null);
      try {
        const data = await getClientsApi();
        if (!isMounted) return;
        setClients(data);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || "Failed to load businesses");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadClients();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        !searchQuery ||
        client.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.contact_name &&
          client.contact_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (client.city &&
          client.city.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = !statusFilter || client.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [clients, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = clients.length;
    const pending = clients.filter((c) => c.status === "pending").length;
    const active = clients.filter((c) => c.status === "active").length;
    return { total, pending, active };
  }, [clients]);

  function openEdit(client: ClientSummary) {
    setEditingClient(client);
    setEditError(null);
    setEditForm({
      company_name: client.company_name,
      contact_name: client.contact_name ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      city: client.city ?? "",
      country: client.country ?? "",
      logo_url: client.logo_url ?? "",
    });
  }

  function closeEdit() {
    setEditingClient(null);
    setEditForm({});
    setEditError(null);
    setSavingEdit(false);
  }

  async function handleSaveEdit() {
    if (!editingClient) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const updated = await updateClientApi(editingClient.id, editForm);
      setClients((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
      );
      closeEdit();
    } catch (err: any) {
      setEditError(err.message || "Failed to update business");
    } finally {
      setSavingEdit(false);
    }
  }

  function handleViewLocations(client: ClientSummary) {
    router.push(`/dashboard/locations?clientId=${encodeURIComponent(client.id)}`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Businesses</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage venue owners, their profiles, and locations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="mr-1 h-4 w-4" />
            Grid
          </Button>
          <Button
            variant={viewMode === "list" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="mr-1 h-4 w-4" />
            List
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-text-secondary">Total businesses</p>
            <p className="mt-2 text-2xl font-semibold text-text-primary">
              {stats.total}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-text-secondary">Pending approval</p>
            <p className="mt-2 text-2xl font-semibold text-text-primary">
              {stats.pending}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-text-secondary">Active</p>
            <p className="mt-2 text-2xl font-semibold text-text-primary">
              {stats.active}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search & filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <Input
              type="search"
              placeholder="Search by business name, contact, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <div className="flex flex-1 flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Status
                </label>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="active">Active</option>
                  <option value="rejected">Rejected</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid or list */}
      {viewMode === "grid" ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading && filteredClients.length === 0 && (
            <p className="text-sm text-text-secondary">Loading businesses...</p>
          )}
          {!loading &&
            filteredClients.map((client) => (
              <Card key={client.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary">
                        {client.company_name}
                      </h3>
                      <p className="mt-1 text-sm text-text-secondary">
                        {[client.city, client.country].filter(Boolean).join(", ")}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClasses(
                        client.status
                      )}`}
                    >
                      {formatStatus(client.status)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-text-secondary">
                    <div>
                      Contact:{" "}
                      <span className="font-medium">
                        {client.contact_name || client.email || "—"}
                      </span>
                    </div>
                    <div className="mt-1 flex gap-4 text-xs">
                      <span>
                        Locations:{" "}
                        <span className="font-medium">
                          {client.locations_count ?? "—"}
                        </span>
                      </span>
                      <span>
                        Facilities:{" "}
                        <span className="font-medium">
                          {client.facilities_count ?? "—"}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEdit(client)}
                    >
                      <Pencil className="mr-1 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewLocations(client)}
                    >
                      <MapPin className="mr-1 h-4 w-4" />
                      View locations
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          {!loading && filteredClients.length === 0 && (
            <p className="text-sm text-text-secondary">
              No businesses found. Try adjusting your filters.
            </p>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-text-primary">
              All businesses
            </h2>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Locations</TableHead>
                  <TableHead>Facilities</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && filteredClients.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-sm text-text-secondary"
                    >
                      Loading businesses...
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        {client.company_name}
                      </TableCell>
                      <TableCell>
                        {client.contact_name || client.email || "—"}
                      </TableCell>
                      <TableCell>
                        {[client.city, client.country]
                          .filter(Boolean)
                          .join(", ")}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClasses(
                            client.status
                          )}`}
                        >
                          {formatStatus(client.status)}
                        </span>
                      </TableCell>
                      <TableCell>{client.locations_count ?? "—"}</TableCell>
                      <TableCell>{client.facilities_count ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewLocations(client)}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            Locations
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(client)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                {!loading && filteredClients.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-sm text-text-secondary"
                    >
                      No businesses found. Try adjusting your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit modal */}
      <Modal
        isOpen={!!editingClient}
        onClose={closeEdit}
        title={
          editingClient
            ? `Edit business – ${editingClient.company_name}`
            : "Edit business"
        }
        size="lg"
      >
        <div className="space-y-4">
          {editError && (
            <div className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-500">
              {editError}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Company name"
              value={editForm.company_name ?? ""}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, company_name: e.target.value }))
              }
            />
            <Input
              label="Contact name"
              value={editForm.contact_name ?? ""}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, contact_name: e.target.value }))
              }
            />
            <Input
              label="Email"
              type="email"
              value={editForm.email ?? ""}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, email: e.target.value }))
              }
            />
            <Input
              label="Phone"
              value={editForm.phone ?? ""}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, phone: e.target.value }))
              }
            />
            <Input
              label="City"
              value={editForm.city ?? ""}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, city: e.target.value }))
              }
            />
            <Input
              label="Country"
              value={editForm.country ?? ""}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, country: e.target.value }))
              }
            />
            <Input
              label="Logo URL"
              value={editForm.logo_url ?? ""}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, logo_url: e.target.value }))
              }
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={closeEdit} disabled={savingEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

