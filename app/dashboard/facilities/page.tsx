"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MapPin, Search, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import type {
  Facility,
  FacilityStatus,
  Location,
  CreateFacilityPayload,
} from "@/lib/api";
import {
  getFacilitiesByLocationApi,
  getLocationsApi,
  createFacilityAtLocationApi,
  updateFacilityAtLocationApi,
  deleteFacilityAtLocationApi,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

type DynamicFieldType = "text" | "textarea" | "number" | "select" | "checkbox";

interface DynamicFieldConfig {
  name: string;
  label: string;
  type: DynamicFieldType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

const FACILITY_TYPE_LABELS: Record<string, string> = {
  "gaming-pc": "Gaming PC",
  vr: "VR",
  ps4: "PS4",
  ps5: "PS5",
  xbox: "XBOX",
  "snooker-table": "Snooker Table",
  "table-tennis-table": "Table Tennis Table",
  "futsal-field": "Futsal Field",
  "cricket-pitch": "Cricket Pitch",
  "padel-court": "Padel Court",
  other: "Other",
};

const FACILITY_DYNAMIC_FIELDS: Record<string, DynamicFieldConfig[]> = {
  "gaming-pc": [
    {
      name: "hourly_rate",
      label: "Hourly rate",
      type: "number",
      required: true,
      placeholder: "e.g. 25",
    },
    {
      name: "specs",
      label: "Specs / notes",
      type: "textarea",
      placeholder: "GPU, CPU, RAM or other details",
    },
    {
      name: "is_private_room",
      label: "Private room",
      type: "checkbox",
    },
  ],
  vr: [
    {
      name: "hourly_rate",
      label: "Hourly rate",
      type: "number",
      required: true,
      placeholder: "e.g. 30",
    },
    {
      name: "headset_type",
      label: "Headset type",
      type: "text",
      placeholder: "e.g. Meta Quest, HTC Vive",
    },
  ],
  ps4: [
    {
      name: "hourly_rate",
      label: "Hourly rate",
      type: "number",
      required: true,
    },
    {
      name: "is_private_room",
      label: "Private room",
      type: "checkbox",
    },
  ],
  ps5: [
    {
      name: "hourly_rate",
      label: "Hourly rate",
      type: "number",
      required: true,
    },
    {
      name: "is_private_room",
      label: "Private room",
      type: "checkbox",
    },
  ],
  xbox: [
    {
      name: "hourly_rate",
      label: "Hourly rate",
      type: "number",
      required: true,
    },
    {
      name: "is_private_room",
      label: "Private room",
      type: "checkbox",
    },
  ],
  "snooker-table": [
    {
      name: "table_size",
      label: "Table size",
      type: "select",
      required: true,
      options: [
        { value: "6ft", label: "6 ft" },
        { value: "7ft", label: "7 ft" },
        { value: "8ft", label: "8 ft" },
        { value: "9ft", label: "9 ft" },
      ],
    },
    {
      name: "hourly_rate",
      label: "Hourly rate",
      type: "number",
      required: true,
    },
    {
      name: "table_count",
      label: "Number of tables (if grouped)",
      type: "number",
    },
  ],
  "table-tennis-table": [
    {
      name: "table_count",
      label: "Number of tables",
      type: "number",
      required: true,
    },
    {
      name: "indoor_outdoor",
      label: "Indoor / outdoor",
      type: "select",
      options: [
        { value: "indoor", label: "Indoor" },
        { value: "outdoor", label: "Outdoor" },
      ],
    },
    {
      name: "hourly_rate",
      label: "Hourly rate",
      type: "number",
    },
  ],
  "futsal-field": [
    {
      name: "surface_type",
      label: "Surface type",
      type: "select",
      options: [
        { value: "turf", label: "Turf" },
        { value: "grass", label: "Grass" },
        { value: "indoor", label: "Indoor court" },
      ],
    },
    {
      name: "is_covered",
      label: "Covered field",
      type: "checkbox",
    },
    {
      name: "hourly_rate",
      label: "Hourly rate",
      type: "number",
    },
  ],
  "cricket-pitch": [
    {
      name: "pitch_type",
      label: "Pitch type",
      type: "select",
      options: [
        { value: "indoor", label: "Indoor" },
        { value: "outdoor", label: "Outdoor" },
        { value: "turf", label: "Turf" },
        { value: "cement", label: "Cement" },
      ],
    },
    {
      name: "session_duration_minutes",
      label: "Default session duration (minutes)",
      type: "number",
    },
    {
      name: "floodlights",
      label: "Floodlights available",
      type: "checkbox",
    },
  ],
  "padel-court": [
    {
      name: "court_count",
      label: "Number of courts",
      type: "number",
      required: true,
    },
    {
      name: "is_indoor",
      label: "Indoor courts",
      type: "checkbox",
    },
    {
      name: "hourly_rate",
      label: "Hourly rate",
      type: "number",
    },
  ],
  other: [
    {
      name: "description",
      label: "Description",
      type: "textarea",
      placeholder: "Short description of this facility",
    },
    {
      name: "notes",
      label: "Internal notes",
      type: "textarea",
      placeholder: "Any internal notes for staff",
    },
  ],
};

function formatFacilityType(type: string) {
  return FACILITY_TYPE_LABELS[type] || type;
}

function formatStatus(status: FacilityStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function FacilitiesPage() {
  const { isClient } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("");

  const [formData, setFormData] = useState<CreateFacilityPayload>({
    name: "",
    type: "other",
    status: "active",
    capacity: undefined,
    metadata: {},
  });

  // Load locations on mount
  useEffect(() => {
    let isMounted = true;
    setLocationsLoading(true);
    setError(null);
    getLocationsApi(undefined)
      .then((data) => {
        if (isMounted) setLocations(data);
      })
      .catch((err: any) => {
        if (isMounted) setError(err.message || "Failed to load locations");
      })
      .finally(() => {
        if (isMounted) setLocationsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // When a location is selected, load its facilities
  useEffect(() => {
    if (!selectedLocationId) {
      setFacilities([]);
      return;
    }
    let isMounted = true;
    setFacilitiesLoading(true);
    setError(null);
    getFacilitiesByLocationApi(selectedLocationId)
      .then((data) => {
        if (isMounted) setFacilities(data);
      })
      .catch((err: any) => {
        if (isMounted) setError(err.message || "Failed to load facilities");
      })
      .finally(() => {
        if (isMounted) setFacilitiesLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedLocationId]);

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === selectedLocationId) ?? null,
    [locations, selectedLocationId]
  );

  function openCreateModal() {
    setEditingFacility(null);
    setFormData({
      name: "",
      type: "other",
      status: "active",
      capacity: undefined,
      metadata: {},
    });
    setIsModalOpen(true);
  }

  function openEditModal(facility: Facility) {
    setEditingFacility(facility);
    setFormData({
      name: facility.name,
      type: facility.type,
      status: facility.status,
      capacity: facility.capacity ?? undefined,
      metadata: facility.metadata ?? {},
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingFacility(null);
    setFormData({
      name: "",
      type: "other",
      status: "active",
      capacity: undefined,
      metadata: {},
    });
  }

  function getDynamicFieldsForType(type: string): DynamicFieldConfig[] {
    return FACILITY_DYNAMIC_FIELDS[type] ?? FACILITY_DYNAMIC_FIELDS.other ?? [];
  }

  function handleMetadataChange(field: DynamicFieldConfig, rawValue: any) {
    setFormData((prev) => {
      const current = prev.metadata ?? {};
      let value: any = rawValue;

      if (field.type === "number") {
        const num = rawValue === "" ? NaN : Number(rawValue);
        value = Number.isNaN(num) ? undefined : num;
      } else if (field.type === "checkbox") {
        value = !!rawValue;
      } else {
        value = rawValue;
      }

      const next = { ...current };

      if (
        value === undefined ||
        value === "" ||
        (typeof value === "number" && Number.isNaN(value))
      ) {
        delete next[field.name];
      } else {
        next[field.name] = value;
      }

      return {
        ...prev,
        metadata: Object.keys(next).length ? next : {},
      };
    });
  }

  async function handleSave() {
    if (!selectedLocationId) return;
    if (!formData.name.trim()) {
      setError("Facility name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingFacility) {
        await updateFacilityAtLocationApi(
          selectedLocationId,
          editingFacility.id,
          formData
        );
      } else {
        await createFacilityAtLocationApi(selectedLocationId, formData);
      }
      const data = await getFacilitiesByLocationApi(selectedLocationId);
      setFacilities(data);
      closeModal();
    } catch (err: any) {
      setError(err.message || (editingFacility ? "Failed to update facility" : "Failed to create facility"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(facility: Facility) {
    if (!selectedLocationId) return;
    if (!confirm(`Delete "${facility.name}"? This cannot be undone.`)) return;
    setDeletingId(facility.id);
    setError(null);
    try {
      await deleteFacilityAtLocationApi(selectedLocationId, facility.id);
      const data = await getFacilitiesByLocationApi(selectedLocationId);
      setFacilities(data);
    } catch (err: any) {
      setError(err.message || "Failed to delete facility");
    } finally {
      setDeletingId(null);
    }
  }

  const filteredFacilities = useMemo(() => {
    return facilities.filter((facility) => {
      const matchesSearch =
        !searchQuery ||
        facility.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = !selectedType || facility.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [facilities, searchQuery, selectedType]);

  const stats = useMemo(() => {
    const total = facilities.length;
    const active = facilities.filter((f) => f.status === "active").length;
    const maintenance = facilities.filter((f) => f.status === "maintenance").length;
    return { total, active, maintenance };
  }, [facilities]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          Facilities
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Add facilities per location (gaming, futsal, padel, etc.). They will appear in the app and can be booked.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Location selector (required first step) */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-text-primary">
            Select location
          </h2>
          <p className="text-sm text-text-secondary">
            Choose a location to view and add facilities. Facilities at this location will be available in the app for bookings.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Location
              </label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                disabled={locationsLoading}
              >
                <option value="">
                  {locationsLoading ? "Loading…" : "Select a location"}
                </option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                    {loc.city || loc.address ? ` — ${loc.city || loc.address}` : ""}
                  </option>
                ))}
              </select>
            </div>
            {selectedLocationId && (
              <Button onClick={openCreateModal}>
                <Plus className="mr-2 h-4 w-4" />
                Add facility
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedLocationId && (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="mx-auto h-12 w-12 text-text-secondary/60" />
            <p className="mt-3 text-sm font-medium text-text-primary">
              Select a location above
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Then you can add and manage facilities (gaming, futsal, padel, etc.) for that location. They will be available in the app for bookings.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedLocationId && (
        <>
          {/* Stats for this location */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-text-secondary">Total</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {stats.total}
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
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-text-secondary">Maintenance</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {stats.maintenance}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search & type filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row">
                <Input
                  type="search"
                  placeholder="Search by name..."
                  icon={<Search className="h-4 w-4" />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <div className="w-full sm:w-48">
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Type
                  </label>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                  >
                    <option value="">All types</option>
                    {Object.entries(FACILITY_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Facilities table for this location */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-text-primary">
                {selectedLocation ? `Facilities at ${selectedLocation.name}` : "Facilities"}
              </h2>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facilitiesLoading && filteredFacilities.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-text-secondary">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                      </TableCell>
                    </TableRow>
                  )}
                  {!facilitiesLoading &&
                    filteredFacilities.map((facility) => (
                      <TableRow key={facility.id}>
                        <TableCell className="font-medium">{facility.name}</TableCell>
                        <TableCell>{formatFacilityType(facility.type)}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              facility.status === "active"
                                ? "bg-success/10 text-success"
                                : facility.status === "maintenance"
                                ? "bg-warning/10 text-warning"
                                : "bg-border text-text-secondary"
                            }`}
                          >
                            {formatStatus(facility.status)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {facility.capacity != null ? facility.capacity : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(facility)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(facility)}
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
                  {!facilitiesLoading && filteredFacilities.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-text-secondary">
                        No facilities yet. Add one with the button above.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Create / Edit Facility Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingFacility ? "Edit facility" : "Add facility"}
        size="lg"
      >
        <div className="space-y-4">
          {selectedLocation && (
            <p className="text-sm text-text-secondary">
              Location: <span className="font-medium text-text-primary">{selectedLocation.name}</span>
            </p>
          )}
          <Input
            label="Facility name *"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. Gaming PC #1, Futsal Court A"
          />
          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">Type *</label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={formData.type}
              onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
            >
              {Object.entries(FACILITY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">Status *</label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={formData.status}
              onChange={(e) =>
                setFormData((prev) => ({
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
          <Input
            label="Capacity"
            type="number"
            value={formData.capacity?.toString() ?? ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                capacity: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            placeholder="e.g. 4"
          />
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
              Configuration for {formatFacilityType(formData.type)}
            </p>
            {getDynamicFieldsForType(formData.type).length === 0 && (
              <p className="text-xs text-text-secondary">
                No extra configuration for this type. You can still use capacity above.
              </p>
            )}
            {getDynamicFieldsForType(formData.type).map((field) => {
              const metadata = formData.metadata ?? {};
              const value = metadata[field.name];

              if (field.type === "checkbox") {
                return (
                  <label
                    key={field.name}
                    className="flex items-center gap-2 text-sm text-text-primary"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
                      checked={!!value}
                      onChange={(e) => handleMetadataChange(field, e.target.checked)}
                    />
                    <span>{field.label}</span>
                  </label>
                );
              }

              if (field.type === "select" && field.options) {
                return (
                  <div key={field.name}>
                    <label className="mb-1 block text-xs font-medium text-text-secondary">
                      {field.label}
                      {field.required && <span className="ml-1 text-red-500">*</span>}
                    </label>
                    <select
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      value={value ?? ""}
                      onChange={(e) => handleMetadataChange(field, e.target.value)}
                    >
                      <option value="">Select…</option>
                      {field.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (field.type === "textarea") {
                return (
                  <div key={field.name}>
                    <label className="mb-1 block text-xs font-medium text-text-secondary">
                      {field.label}
                    </label>
                    <textarea
                      className="min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder={field.placeholder}
                      value={value ?? ""}
                      onChange={(e) => handleMetadataChange(field, e.target.value)}
                    />
                  </div>
                );
              }

              return (
                <Input
                  key={field.name}
                  label={field.label}
                  type={field.type === "number" ? "number" : "text"}
                  value={
                    field.type === "number" && typeof value === "number"
                      ? value.toString()
                      : value ?? ""
                  }
                  placeholder={field.placeholder}
                  onChange={(e) => handleMetadataChange(field, e.target.value)}
                />
              );
            })}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : editingFacility ? (
                "Save"
              ) : (
                "Add facility"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
