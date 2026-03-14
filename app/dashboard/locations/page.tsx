"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapPin, Plus, Pencil, Trash2, LayoutGrid, List, X } from "lucide-react";
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
import {
  Location,
  getLocationsApi,
  createLocationApi,
  updateLocationApi,
  deleteLocationApi,
  LocationPayload,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const emptyForm: LocationPayload = {
  name: "",
  description: null,
  phone: null,
  address: null,
  city: null,
  state: null,
  country: null,
  postal_code: null,
  latitude: null,
  longitude: null,
};

function LocationFormFields({
  formData,
  setFormData,
}: {
  formData: LocationPayload;
  setFormData: React.Dispatch<React.SetStateAction<LocationPayload>>;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="Location Name *"
        value={formData.name}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, name: e.target.value }))
        }
        placeholder="e.g. Main Branch"
      />
      <Input
        label="Description"
        value={formData.description || ""}
        onChange={(e) =>
          setFormData((prev) => ({
            ...prev,
            description: e.target.value || null,
          }))
        }
        placeholder="Location description"
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
        placeholder="+1 234-567-8900"
      />
      <Input
        label="Address"
        value={formData.address || ""}
        onChange={(e) =>
          setFormData((prev) => ({
            ...prev,
            address: e.target.value || null,
          }))
        }
        placeholder="Street address"
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
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Latitude"
          type="number"
          step="any"
          value={formData.latitude?.toString() || ""}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              latitude: e.target.value ? Number(e.target.value) : null,
            }))
          }
          placeholder="e.g. 40.7128"
        />
        <Input
          label="Longitude"
          type="number"
          step="any"
          value={formData.longitude?.toString() || ""}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              longitude: e.target.value ? Number(e.target.value) : null,
            }))
          }
          placeholder="e.g. -74.0060"
        />
      </div>
    </div>
  );
}

export default function LocationsPage() {
  const { user, isClient } = useAuth();
  const searchParams = useSearchParams();
  // For clients, don't pass clientId - backend will filter by authenticated user
  // For admins viewing specific client, use query param
  const clientId = isClient() ? undefined : searchParams.get("clientId") || undefined;

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [formData, setFormData] = useState<LocationPayload>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    return (localStorage.getItem("locations-view") as "grid" | "list") || "grid";
  });

  function setViewModeAndPersist(mode: "grid" | "list") {
    setViewMode(mode);
    if (typeof window !== "undefined") localStorage.setItem("locations-view", mode);
  }

  useEffect(() => {
    loadLocations();
  }, [clientId]);

  async function loadLocations() {
    setLoading(true);
    setError(null);
    try {
      const data = await getLocationsApi(clientId);
      setLocations(data);
    } catch (err: any) {
      setError(err.message || "Failed to load locations");
    } finally {
      setLoading(false);
    }
  }

  function startCreate() {
    setEditingLocationId(null);
    setFormData(emptyForm);
    setIsCreating(true);
  }

  function cancelCreate() {
    setIsCreating(false);
    setFormData(emptyForm);
  }

  function startEdit(location: Location) {
    setIsCreating(false);
    setEditingLocationId(location.id);
    setFormData({
      name: location.name,
      description: location.description || null,
      phone: location.phone || null,
      address: location.address || null,
      city: location.city || null,
      state: location.state || null,
      country: location.country || null,
      postal_code: location.postal_code || null,
      latitude: location.latitude || null,
      longitude: location.longitude || null,
    });
  }

  function cancelEdit() {
    setEditingLocationId(null);
    setFormData(emptyForm);
  }

  async function handleSaveCreate() {
    if (!formData.name.trim()) {
      setError("Location name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: LocationPayload = {
        ...formData,
        ...(clientId && { client_id: clientId }),
      };
      await createLocationApi(payload);
      await loadLocations();
      cancelCreate();
    } catch (err: any) {
      setError(err.message || "Failed to create location");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit() {
    if (!editingLocationId || !formData.name.trim()) {
      setError("Location name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateLocationApi(editingLocationId, formData);
      await loadLocations();
      cancelEdit();
    } catch (err: any) {
      setError(err.message || "Failed to update location");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this location?")) return;

    setDeletingId(id);
    setError(null);

    try {
      await deleteLocationApi(id);
      await loadLocations();
    } catch (err: any) {
      setError(err.message || "Failed to delete location");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Locations
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your business locations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
            <button
              type="button"
              onClick={() => setViewModeAndPersist("grid")}
              className={`rounded-md p-2 transition-colors ${
                viewMode === "grid"
                  ? "bg-background text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewModeAndPersist("list")}
              className={`rounded-md p-2 transition-colors ${
                viewMode === "list"
                  ? "bg-background text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          {(isClient() || !clientId) && !isCreating && (
            <Button onClick={startCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Inline Create Form */}
      {(isClient() || !clientId) && isCreating && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-lg font-medium text-text-primary">Add Location</h2>
            <button
              type="button"
              onClick={cancelCreate}
              className="rounded p-1 text-text-secondary hover:bg-muted hover:text-text-primary"
              aria-label="Cancel"
            >
              <X className="h-5 w-5" />
            </button>
          </CardHeader>
          <CardContent>
            <LocationFormFields formData={formData} setFormData={setFormData} />
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={cancelCreate}>
                Cancel
              </Button>
              <Button onClick={handleSaveCreate} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locations: Grid or List */}
      {viewMode === "grid" ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading && locations.length === 0 && (
            <div className="col-span-full flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
            </div>
          )}
          {!loading &&
            locations.map((location) => (
              <Card key={location.id}>
                {editingLocationId === location.id ? (
                  <>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <h2 className="text-lg font-medium text-text-primary">Edit Location</h2>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded p-1 text-text-secondary hover:bg-muted hover:text-text-primary"
                        aria-label="Cancel"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </CardHeader>
                    <CardContent>
                      <LocationFormFields formData={formData} setFormData={setFormData} />
                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="secondary" onClick={cancelEdit}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={saving}>
                          {saving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save"
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-text-primary">
                            {location.name}
                          </h3>
                          <p className="mt-1 text-sm text-text-secondary">
                            {[location.city, location.state, location.country]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        </div>
                        <MapPin className="h-5 w-5 text-text-secondary" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-text-secondary">
                        {location.address}
                      </p>
                      {(isClient() || !clientId) && (
                        <div className="mt-4 flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => startEdit(location)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(location.id)}
                            disabled={deletingId === location.id}
                          >
                            {deletingId === location.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </>
                )}
              </Card>
            ))}
          {!loading && locations.length === 0 && (
            <div className="col-span-full py-12 text-center text-sm text-text-secondary">
              No locations found.
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Country</TableHead>
                  {(isClient() || !clientId) && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && locations.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={isClient() || !clientId ? 6 : 5}
                      className="py-8 text-center"
                    >
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-text-secondary" />
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  locations.map((location) => (
                    <TableRow key={location.id}>
                      {editingLocationId === location.id ? (
                        <TableCell
                          colSpan={isClient() || !clientId ? 6 : 5}
                          className="bg-muted/30 p-4"
                        >
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-text-primary">Edit Location</h3>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="rounded p-1 text-text-secondary hover:bg-background hover:text-text-primary"
                                aria-label="Cancel"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                            <LocationFormFields formData={formData} setFormData={setFormData} />
                            <div className="flex justify-end gap-2">
                              <Button variant="secondary" onClick={cancelEdit}>
                                Cancel
                              </Button>
                              <Button onClick={handleSaveEdit} disabled={saving}>
                                {saving ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  "Save"
                                )}
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      ) : (
                        <>
                          <TableCell className="font-medium">
                            {location.name}
                          </TableCell>
                          <TableCell>{location.address || "—"}</TableCell>
                          <TableCell>{location.city || "—"}</TableCell>
                          <TableCell>{location.state || "—"}</TableCell>
                          <TableCell>{location.country || "—"}</TableCell>
                          {(isClient() || !clientId) && (
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => startEdit(location)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(location.id)}
                                  disabled={deletingId === location.id}
                                >
                                  {deletingId === location.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </>
                      )}
                    </TableRow>
                  ))}
                {!loading && locations.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={isClient() || !clientId ? 6 : 5}
                      className="py-8 text-center text-sm text-text-secondary"
                    >
                      No locations found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
