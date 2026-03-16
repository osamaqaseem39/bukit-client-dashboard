"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Pencil, Plus, Trash2, X, Copy } from "lucide-react";
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

/** Backend facility types – used for type-specific fields and metadata. */
const FACILITY_TYPES = [
  { value: "gaming-pc", label: "Gaming PC" },
  { value: "ps4", label: "PS4" },
  { value: "ps5", label: "PS5" },
  { value: "xbox", label: "Xbox" },
  { value: "snooker-table", label: "Snooker Table" },
  { value: "table-tennis-table", label: "Table Tennis Table" },
  { value: "futsal-field", label: "Futsal Field" },
  { value: "cricket-pitch", label: "Cricket Pitch" },
  { value: "padel-court", label: "Padel Court" },
  { value: "other", label: "Other" },
] as const;

type FacilityTypeValue = (typeof FACILITY_TYPES)[number]["value"];

interface PcEntry {
  label: string;
  cpu: string;
  gpu: string;
  ram: string;
  refreshRate: string;
}

interface StationEntry {
  label: string;
}

interface FacilityFormState {
  name: string;
  type: FacilityTypeValue;
  status: FacilityStatus;
  capacity: number | null;
  /** For gaming-pc */
  pcs: PcEntry[];
  /** For ps4 / ps5 / xbox */
  stations: StationEntry[];
  screenSizeInches: string;
  gamesAvailable: string;
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
    type: "gaming-pc",
    status: "active",
    capacity: null,
    pcs: [{ label: "PC 1", cpu: "", gpu: "", ram: "", refreshRate: "" }],
    stations: [{ label: "Station 1" }],
    screenSizeInches: "",
    gamesAvailable: "",
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
      type: "gaming-pc",
      status: "active",
      capacity: null,
      pcs: [{ label: "PC 1", cpu: "", gpu: "", ram: "", refreshRate: "" }],
      stations: [{ label: "Station 1" }],
      screenSizeInches: "",
      gamesAvailable: "",
    });
    setShowForm(true);
  }

  function openEditForm(facility: Facility) {
    setEditingFacility(facility);
    const meta = (facility.metadata || {}) as Record<string, any>;
    const pcsRaw = Array.isArray(meta.pcs) ? meta.pcs : [];
    const pcs: PcEntry[] =
      pcsRaw.length > 0
        ? pcsRaw.map((pc: any) => ({
            label: pc.label ?? "",
            cpu: pc.cpu ?? "",
            gpu: pc.gpu ?? "",
            ram: pc.ram ?? "",
            refreshRate: pc.refresh_rate_hz != null ? String(pc.refresh_rate_hz) : "",
          }))
        : [{ label: "PC 1", cpu: "", gpu: "", ram: "", refreshRate: "" }];
    const stationsRaw = Array.isArray(meta.stations) ? meta.stations : [];
    const stations: StationEntry[] =
      stationsRaw.length > 0
        ? stationsRaw.map((s: any) => ({
            label: typeof s === "string" ? s : s?.label ?? "",
          }))
        : [{ label: "Station 1" }];
    setFormState({
      name: facility.name,
      type: (facility.type as FacilityTypeValue) || "gaming-pc",
      status: facility.status,
      capacity:
        typeof facility.capacity === "number" ? facility.capacity : null,
      pcs,
      stations,
      screenSizeInches:
        meta.screen_size_inches != null ? String(meta.screen_size_inches) : "",
      gamesAvailable: meta.games_available ?? "",
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingFacility(null);
  }

  function buildMetadata(): Record<string, any> | undefined {
    const { type, pcs, stations, screenSizeInches, gamesAvailable } =
      formState;
    const meta: Record<string, any> = {};

    if (type === "gaming-pc" && pcs.length > 0) {
      const list = pcs
        .map((pc) => {
          const label = (pc.label || "").trim();
          const cpu = (pc.cpu || "").trim();
          const gpu = (pc.gpu || "").trim();
          const ram = (pc.ram || "").trim();
          const refreshStr = (pc.refreshRate || "").trim();
          if (!label && !cpu && !gpu && !ram && !refreshStr) return null;
          const refresh_rate_hz = refreshStr ? Number(refreshStr) : undefined;
          return {
            label: label || undefined,
            cpu: cpu || undefined,
            gpu: gpu || undefined,
            ram: ram || undefined,
            refresh_rate_hz:
              refresh_rate_hz != null && !Number.isNaN(refresh_rate_hz)
                ? refresh_rate_hz
                : undefined,
          };
        })
        .filter(Boolean);
      if (list.length) meta.pcs = list;
    }

    if (
      (type === "ps4" || type === "ps5" || type === "xbox") &&
      stations.length > 0
    ) {
      const list = stations
        .map((s) => (s.label || "").trim())
        .filter(Boolean);
      if (list.length) meta.stations = list;
      const screenNum = screenSizeInches.trim()
        ? Number(screenSizeInches)
        : undefined;
      if (screenNum != null && !Number.isNaN(screenNum))
        meta.screen_size_inches = screenNum;
      if ((gamesAvailable || "").trim()) meta.games_available = gamesAvailable.trim();
    }

    return Object.keys(meta).length ? meta : undefined;
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
        metadata: buildMetadata(),
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
                    Facility type
                  </label>
                  <select
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                    value={formState.type}
                    onChange={(e) => {
                      const newType = e.target.value as FacilityTypeValue;
                      setFormState((prev) => {
                        const next = { ...prev, type: newType };
                        if (newType === "gaming-pc" && prev.type !== "gaming-pc") {
                          next.pcs =
                            prev.pcs?.length > 0
                              ? prev.pcs
                              : [
                                  {
                                    label: "PC 1",
                                    cpu: "",
                                    gpu: "",
                                    ram: "",
                                    refreshRate: "",
                                  },
                                ];
                        }
                        if (
                          (newType === "ps4" || newType === "ps5" || newType === "xbox") &&
                          prev.type !== "ps4" && prev.type !== "ps5" && prev.type !== "xbox"
                        ) {
                          next.stations =
                            prev.stations?.length > 0
                              ? prev.stations
                              : [{ label: "Station 1" }];
                        }
                        return next;
                      });
                    }}
                  >
                    {FACILITY_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
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

              {/* Type-specific: Gaming PC – list of PCs */}
              {formState.type === "gaming-pc" && (
                <div className="space-y-3 rounded-lg border border-border bg-surface/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">
                      PC units &amp; specs
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setFormState((prev) => ({
                          ...prev,
                          pcs: [
                            ...prev.pcs,
                            {
                              label: `PC ${prev.pcs.length + 1}`,
                              cpu: "",
                              gpu: "",
                              ram: "",
                              refreshRate: "",
                            },
                          ],
                        }))
                      }
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add PC
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formState.pcs.map((pc, index) => (
                      <div
                        key={index}
                        className="grid gap-2 rounded-md border border-border bg-white p-3 md:grid-cols-5"
                      >
                        <Input
                          label="Label"
                          placeholder={`PC ${index + 1}`}
                          value={pc.label}
                          onChange={(e) => {
                            const pcs = [...formState.pcs];
                            pcs[index] = { ...pcs[index], label: e.target.value };
                            setFormState((prev) => ({ ...prev, pcs }));
                          }}
                        />
                        <Input
                          label="CPU"
                          placeholder="e.g. i5 / i7"
                          value={pc.cpu}
                          onChange={(e) => {
                            const pcs = [...formState.pcs];
                            pcs[index] = { ...pcs[index], cpu: e.target.value };
                            setFormState((prev) => ({ ...prev, pcs }));
                          }}
                        />
                        <Input
                          label="GPU"
                          placeholder="e.g. GTX 1660"
                          value={pc.gpu}
                          onChange={(e) => {
                            const pcs = [...formState.pcs];
                            pcs[index] = { ...pcs[index], gpu: e.target.value };
                            setFormState((prev) => ({ ...prev, pcs }));
                          }}
                        />
                        <Input
                          label="RAM"
                          placeholder="e.g. 16GB"
                          value={pc.ram}
                          onChange={(e) => {
                            const pcs = [...formState.pcs];
                            pcs[index] = { ...pcs[index], ram: e.target.value };
                            setFormState((prev) => ({ ...prev, pcs }));
                          }}
                        />
                        <div className="flex items-end gap-2">
                          <Input
                            label="Refresh (Hz)"
                            type="number"
                            placeholder="144"
                            value={pc.refreshRate}
                            onChange={(e) => {
                              const pcs = [...formState.pcs];
                              pcs[index] = {
                                ...pcs[index],
                                refreshRate: e.target.value,
                              };
                              setFormState((prev) => ({ ...prev, pcs }));
                            }}
                          />
                          <button
                            type="button"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-surface hover:text-text-primary"
                            onClick={() => {
                              const pcs = [...formState.pcs];
                              const baseLabel = pc.label?.trim() || `PC ${index + 1}`;
                              pcs.push({
                                ...pc,
                                label: `${baseLabel} (copy)`,
                              });
                              setFormState((prev) => ({ ...prev, pcs }));
                            }}
                            aria-label="Duplicate PC"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          {formState.pcs.length > 1 && (
                            <button
                              type="button"
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-surface hover:text-text-primary"
                              onClick={() => {
                                const pcs = formState.pcs.filter((_, i) => i !== index);
                                setFormState((prev) => ({ ...prev, pcs }));
                              }}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Type-specific: PS4 / PS5 / Xbox – stations + optional screen & games */}
              {(formState.type === "ps4" ||
                formState.type === "ps5" ||
                formState.type === "xbox") && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Screen size (inches)"
                      type="number"
                      placeholder="e.g. 32"
                      value={formState.screenSizeInches}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          screenSizeInches: e.target.value,
                        }))
                      }
                    />
                    <Input
                      label="Games available"
                      placeholder="e.g. FIFA, COD, GTA"
                      value={formState.gamesAvailable}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          gamesAvailable: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-3 rounded-lg border border-border bg-surface/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text-primary">
                        Stations / consoles
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setFormState((prev) => ({
                            ...prev,
                            stations: [
                              ...prev.stations,
                              {
                                label: `Station ${prev.stations.length + 1}`,
                              },
                            ],
                          }))
                        }
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add station
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {formState.stations.map((station, index) => (
                        <div
                          key={index}
                          className="flex gap-2 rounded-md border border-border bg-white p-2"
                        >
                          <Input
                            label="Label"
                            placeholder={`Station ${index + 1}`}
                            value={station.label}
                            onChange={(e) => {
                              const stations = [...formState.stations];
                              stations[index] = {
                                ...stations[index],
                                label: e.target.value,
                              };
                              setFormState((prev) => ({ ...prev, stations }));
                            }}
                            className="flex-1"
                          />
                          {formState.stations.length > 1 && (
                            <button
                              type="button"
                              className="mt-6 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-surface hover:text-text-primary"
                              onClick={() => {
                                const stations = formState.stations.filter(
                                  (_, i) => i !== index
                                );
                                setFormState((prev) => ({ ...prev, stations }));
                              }}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <Input
                label="Capacity (optional)"
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