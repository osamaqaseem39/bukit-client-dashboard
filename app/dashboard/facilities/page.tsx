"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
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
  Facility,
  FacilityStatus,
  getLocationsApi,
  getFacilitiesByLocationApi,
  createFacilityAtLocationApi,
  updateFacilityAtLocationApi,
  deleteFacilityAtLocationApi,
  CreateFacilityPayload,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type FacilityType =
  | "gaming"
  | "snooker"
  | "table-tennis"
  | "arena"
  | "other";

interface FacilityFormState {
  name: string;
  type: FacilityType;
  status: FacilityStatus;
  capacity: number | null;
}

export default function FacilitiesPage() {
  const { user } = useAuth();

  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formState, setFormState] = useState<FacilityFormState>({
    name: "",
    type: "gaming",
    status: "active",
    capacity: null,
  });

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      loadFacilities(selectedLocationId);
    } else {
      setFacilities([]);
    }
  }, [selectedLocationId]);

  async function loadLocations() {
    setLoadingLocations(true);
    setError(null);
    try {
      const data = await getLocationsApi();
      setLocations(data);
      if (data.length > 0) {
        setSelectedLocationId((prev) => prev || data[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load locations");
    } finally {
      setLoadingLocations(false);
    }
  }

  async function loadFacilities(locationId: string) {
    setLoadingFacilities(true);
    setError(null);
    try {
      const data = await getFacilitiesByLocationApi(locationId);
      setFacilities(data);
    } catch (err: any) {
      setError(err.message || "Failed to load facilities");
    } finally {
      setLoadingFacilities(false);
    }
  }

  function openCreateForm() {
    setEditingFacility(null);
    setFormState({
      name: "",
      type: "gaming",
      status: "active",
      capacity: null,
    });
    setShowForm(true);
  }

  function openEditForm(facility: Facility) {
    setEditingFacility(facility);
    setFormState({
      name: facility.name,
      type: (facility.type as FacilityType) || "gaming",
      status: facility.status,
      capacity:
        typeof facility.capacity === "number" ? facility.capacity : null,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingFacility(null);
  }

  async function handleSave() {
    if (!selectedLocationId) {
      setError("Please select a location first");
      return;
    }

    if (!formState.name.trim()) {
      setError("Facility name is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: CreateFacilityPayload = {
        name: formState.name.trim(),
        type: formState.type,
        status: formState.status,
        capacity:
          formState.capacity !== null && !Number.isNaN(formState.capacity)
            ? formState.capacity
            : undefined,
        metadata: {},
      };

      if (editingFacility) {
        await updateFacilityAtLocationApi(
          selectedLocationId,
          editingFacility.id,
          payload,
        );
      } else {
        await createFacilityAtLocationApi(selectedLocationId, payload);
      }

      await loadFacilities(selectedLocationId);
      closeForm();
    } catch (err: any) {
      setError(
        err.message ||
          `Failed to ${editingFacility ? "update" : "create"} facility`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(facilityId: string) {
    if (!selectedLocationId) return;
    if (!confirm("Are you sure you want to delete this facility?")) return;

    setDeletingId(facilityId);
    setError(null);

    try {
      await deleteFacilityAtLocationApi(selectedLocationId, facilityId);
      await loadFacilities(selectedLocationId);
    } catch (err: any) {
      setError(err.message || "Failed to delete facility");
    } finally {
      setDeletingId(null);
    }
  }

  const selectedLocation = useMemo(
    () => locations.find((loc) => loc.id === selectedLocationId) || null,
    [locations, selectedLocationId],
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Facilities
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage the facilities available at your locations.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-text-secondary" />
            <select
              className="min-w-[200px] rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              disabled={loadingLocations || locations.length === 0}
            >
              {loadingLocations && (
                <option value="">Loading locations...</option>
              )}
              {!loadingLocations && locations.length === 0 && (
                <option value="">No locations found</option>
              )}
              {!loadingLocations &&
                locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
            </select>
          </div>
          <Button
            onClick={openCreateForm}
            disabled={!selectedLocationId || loadingLocations}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Facility
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Facilities Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-text-primary">
                {selectedLocation
                  ? `Facilities at ${selectedLocation.name}`
                  : "Facilities"}
              </h2>
              {selectedLocation && (
                <p className="mt-1 text-xs text-text-secondary">
                  {[
                    selectedLocation.address,
                    selectedLocation.city,
                    selectedLocation.country,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>
            {loadingFacilities && (
              <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facilities.map((facility) => (
                <TableRow key={facility.id}>
                  <TableCell className="font-medium">
                    {facility.name}
                  </TableCell>
                  <TableCell className="capitalize">
                    {facility.type.replace("-", " ")}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        facility.status === "active"
                          ? "bg-success/10 text-success"
                          : facility.status === "maintenance"
                          ? "bg-warning/10 text-warning"
                          : "bg-text-secondary/10 text-text-secondary"
                      }`}
                    >
                      {facility.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {typeof facility.capacity === "number"
                      ? facility.capacity
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditForm(facility)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(facility.id)}
                        disabled={deletingId === facility.id}
                      >
                        {deletingId === facility.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loadingFacilities && facilities.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-sm text-text-secondary"
                  >
                    {selectedLocationId
                      ? "No facilities found for this location. Create your first one."
                      : "Select a location to see its facilities."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Facility form – inline on page */}
      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-text-primary">
              {editingFacility ? "Edit Facility" : "Add Facility"}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {editingFacility
                ? "Update the facility details below."
                : "Enter the new facility details for the selected location."}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                label="Facility Name *"
                value={formState.name}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Snooker Table 1"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-secondary">
                    Type
                  </label>
                  <select
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                    value={formState.type}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        type: e.target.value as FacilityType,
                      }))
                    }
                  >
                    <option value="gaming">Gaming</option>
                    <option value="snooker">Snooker</option>
                    <option value="table-tennis">Table Tennis</option>
                    <option value="arena">Arena</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-secondary">
                    Status
                  </label>
                  <select
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                    value={formState.status}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        status: e.target.value as FacilityStatus,
                      }))
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              <Input
                label="Capacity"
                type="number"
                value={
                  formState.capacity !== null ? String(formState.capacity) : ""
                }
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    capacity: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="e.g. 4"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={closeForm}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}