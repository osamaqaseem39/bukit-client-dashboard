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

/** Arena-only facility types for this dashboard. */
const FACILITY_TYPES = [
  { value: "futsal-field", label: "Futsal Field" },
  { value: "cricket-pitch", label: "Cricket Pitch" },
  { value: "padel-court", label: "Padel Court" },
] as const;

type FacilityTypeValue = (typeof FACILITY_TYPES)[number]["value"];
const ARENA_FACILITY_TYPES = ["futsal-field", "cricket-pitch", "padel-court"] as const;

function isArenaFacilityType(type: string): type is FacilityTypeValue {
  return (ARENA_FACILITY_TYPES as readonly string[]).includes(type);
}

interface PcEntry {
  label: string;
  cpu: string;
  gpu: string;
  ram: string;
  refreshRate: string;
}

interface StationEntry {
  label: string;
  screenSizeInches: string;
}

interface FacilityPackageEntry {
  id: string;
  title: string;
  minutes: string;
  price: string;
  currency: string;
  validityHours: string;
}

interface PerMinutePricingState {
  ratePerMinute: string;
  currency: string;
  billingIntervalMinutes: string;
  minimumMinutes: string;
}

type CourtSizeMode = "single" | "split-two" | "double";

interface ArenaPricingState {
  ratePerHour: string;
  currency: string;
}

interface FacilityFormState {
  name: string;
  type: FacilityTypeValue;
  status: FacilityStatus;
  /** For gaming-pc */
  pcs: PcEntry[];
  /** For ps4 / ps5 / xbox */
  stations: StationEntry[];
  gamesAvailable: string;
  pricingPerMinute: PerMinutePricingState;
  pricingPackages: FacilityPackageEntry[];
  arenaDimensions: {
    height: string;
    length: string;
    width: string;
    unit: "ft" | "m";
  };
  arenaPricing: ArenaPricingState;
  courtSizeMode: CourtSizeMode;
}

function makeId(prefix: string) {
  // Avoid relying on crypto.randomUUID in older browsers.
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
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
    type: "futsal-field",
    status: "active",
    pcs: [{ label: "PC 1", cpu: "", gpu: "", ram: "", refreshRate: "" }],
    stations: [{ label: "Station 1", screenSizeInches: "" }],
    gamesAvailable: "",
    pricingPerMinute: {
      ratePerMinute: "",
      currency: "PKR",
      billingIntervalMinutes: "10",
      minimumMinutes: "",
    },
    pricingPackages: [],
    arenaDimensions: {
      height: "",
      length: "",
      width: "",
      unit: "ft",
    },
    arenaPricing: {
      ratePerHour: "",
      currency: "PKR",
    },
    courtSizeMode: "single",
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
      type: "futsal-field",
      status: "active",
      pcs: [{ label: "PC 1", cpu: "", gpu: "", ram: "", refreshRate: "" }],
      stations: [{ label: "Station 1", screenSizeInches: "" }],
      gamesAvailable: "",
      pricingPerMinute: {
        ratePerMinute: "",
        currency: "PKR",
        billingIntervalMinutes: "10",
        minimumMinutes: "",
      },
      pricingPackages: [],
      arenaDimensions: {
        height: "",
        length: "",
        width: "",
        unit: "ft",
      },
      arenaPricing: {
        ratePerHour: "",
        currency: "PKR",
      },
      courtSizeMode: "single",
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
            screenSizeInches:
              typeof s === "object" && s
                ? s?.screen_size_inches != null
                  ? String(s.screen_size_inches)
                  : meta.screen_size_inches != null
                  ? String(meta.screen_size_inches)
                  : ""
                : meta.screen_size_inches != null
                ? String(meta.screen_size_inches)
                : "",
          }))
        : [
            {
              label: "Station 1",
              screenSizeInches:
                meta.screen_size_inches != null ? String(meta.screen_size_inches) : "",
            },
          ];
    const pricing = (meta as any)?.pricing || {};
    const per = pricing?.per_minute;
    const pricingPerMinute: PerMinutePricingState = {
      ratePerMinute:
        per?.rate_per_minute != null && !Number.isNaN(Number(per.rate_per_minute))
          ? String(per.rate_per_minute)
          : "",
      currency: typeof per?.currency === "string" && per.currency ? per.currency : "PKR",
      billingIntervalMinutes:
        per?.billing_interval_minutes != null &&
        !Number.isNaN(Number(per.billing_interval_minutes))
          ? String(per.billing_interval_minutes)
          : "10",
      minimumMinutes:
        per?.minimum_minutes != null && !Number.isNaN(Number(per.minimum_minutes))
          ? String(per.minimum_minutes)
          : "",
    };

    const packagesRaw = Array.isArray(pricing?.packages) ? pricing.packages : [];
    const pricingPackages: FacilityPackageEntry[] = packagesRaw.map((p: any) => ({
      id: String(p?.id || makeId("pkg")),
      title: String(p?.title ?? ""),
      minutes: p?.minutes != null ? String(p.minutes) : "",
      price: p?.price != null ? String(p.price) : "",
      currency: typeof p?.currency === "string" && p.currency ? p.currency : pricingPerMinute.currency || "PKR",
      validityHours: p?.validity_hours != null ? String(p.validity_hours) : "",
    }));

    const arenaDimensionsRaw = meta?.arena_dimensions || {};
    const arenaDimensions = {
      height:
        arenaDimensionsRaw?.height != null
          ? String(arenaDimensionsRaw.height)
          : "",
      length:
        arenaDimensionsRaw?.length != null ? String(arenaDimensionsRaw.length) : "",
      width:
        arenaDimensionsRaw?.width != null ? String(arenaDimensionsRaw.width) : "",
      unit: arenaDimensionsRaw?.unit === "m" ? "m" : "ft",
    } as FacilityFormState["arenaDimensions"];
    const arenaPerHour = pricing?.per_hour;
    const arenaPricing: ArenaPricingState = {
      ratePerHour:
        arenaPerHour?.rate_per_hour != null &&
        !Number.isNaN(Number(arenaPerHour.rate_per_hour))
          ? String(arenaPerHour.rate_per_hour)
          : "",
      currency:
        typeof arenaPerHour?.currency === "string" && arenaPerHour.currency
          ? arenaPerHour.currency
          : "PKR",
    };
    const courtSizeMode: CourtSizeMode =
      meta?.court_size_mode === "split-two" || meta?.court_size_mode === "double"
        ? meta.court_size_mode
        : "single";

    setFormState({
      name: facility.name,
      type: (facility.type as FacilityTypeValue) || "futsal-field",
      status: facility.status,
      pcs,
      stations,
      gamesAvailable: meta.games_available ?? "",
      pricingPerMinute,
      pricingPackages,
      arenaDimensions,
      arenaPricing,
      courtSizeMode,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingFacility(null);
  }

  function buildMetadata(): Record<string, any> | undefined {
    const {
      type,
      pcs,
      stations,
      gamesAvailable,
      pricingPerMinute,
      pricingPackages,
      arenaDimensions,
      arenaPricing,
      courtSizeMode,
    } = formState;
    const meta: Record<string, any> = {};

    // Pricing (mainly for gaming facilities)
    const packages = (pricingPackages || [])
      .map((p) => {
        const title = (p.title || "").trim();
        const minutes = p.minutes.trim() ? Number(p.minutes) : NaN;
        const price = p.price.trim() ? Number(p.price) : NaN;
        const currency = (p.currency || "").trim();
        const validity_hours = p.validityHours.trim()
          ? Number(p.validityHours)
          : undefined;
        if (!title && !p.minutes.trim() && !p.price.trim() && !currency) return null;
        return {
          id: p.id || makeId("pkg"),
          title: title || undefined,
          minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : undefined,
          price: Number.isFinite(price) && price >= 0 ? price : undefined,
          currency: currency || undefined,
          validity_hours:
            validity_hours != null && Number.isFinite(validity_hours) && validity_hours > 0
              ? validity_hours
              : undefined,
        };
      })
      .filter(Boolean)
      .filter((p: any) => p.title && p.minutes && p.currency && p.price != null);

    const rate = pricingPerMinute.ratePerMinute.trim()
      ? Number(pricingPerMinute.ratePerMinute)
      : NaN;
    const interval = pricingPerMinute.billingIntervalMinutes.trim()
      ? Number(pricingPerMinute.billingIntervalMinutes)
      : NaN;
    const minMinutes = pricingPerMinute.minimumMinutes.trim()
      ? Number(pricingPerMinute.minimumMinutes)
      : undefined;
    const currency = (pricingPerMinute.currency || "").trim();

    const per_minute =
      Number.isFinite(rate) && rate >= 0 && Number.isFinite(interval) && interval > 0 && currency
        ? {
            rate_per_minute: rate,
            currency,
            billing_interval_minutes: interval,
            minimum_minutes:
              minMinutes != null && Number.isFinite(minMinutes) && minMinutes >= 0
                ? minMinutes
                : undefined,
          }
        : undefined;

    if (packages.length || per_minute) {
      meta.pricing = {
        ...(packages.length ? { packages } : {}),
        ...(per_minute ? { per_minute } : {}),
      };
    }

    if (isArenaFacilityType(type)) {
      const arenaLength = arenaDimensions.length.trim()
        ? Number(arenaDimensions.length)
        : NaN;
      const arenaWidth = arenaDimensions.width.trim()
        ? Number(arenaDimensions.width)
        : NaN;
      const arenaHeight = arenaDimensions.height.trim()
        ? Number(arenaDimensions.height)
        : NaN;
      const arenaRatePerHour = arenaPricing.ratePerHour.trim()
        ? Number(arenaPricing.ratePerHour)
        : NaN;
      const arenaCurrency = (arenaPricing.currency || "").trim();

      if (
        Number.isFinite(arenaLength) &&
        Number.isFinite(arenaWidth) &&
        Number.isFinite(arenaHeight)
      ) {
        meta.arena_dimensions = {
          height: arenaHeight,
          length: arenaLength,
          width: arenaWidth,
          unit: arenaDimensions.unit,
        };
      }
      if (courtSizeMode) {
        meta.court_size_mode = courtSizeMode;
      }
      if (
        Number.isFinite(arenaRatePerHour) &&
        arenaRatePerHour >= 0 &&
        arenaCurrency
      ) {
        meta.pricing = {
          ...(meta.pricing || {}),
          per_hour: {
            rate_per_hour: arenaRatePerHour,
            currency: arenaCurrency,
          },
        };
      }
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
                    colSpan={4}
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
        <Card className="mx-auto w-full max-w-4xl">
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
                placeholder="e.g. Futsal Court A"
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

              {isArenaFacilityType(formState.type) && (
                <div className="space-y-4 rounded-lg border border-border bg-surface/50 p-4">
                  <div className="text-sm font-medium text-text-primary">
                    Arena booking details
                  </div>
                  <div className="grid gap-4 md:grid-cols-12">
                    <div className="md:col-span-3">
                      <Input
                        label="Court length"
                        type="number"
                        step="any"
                        placeholder="e.g. 100"
                        value={formState.arenaDimensions.length}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            arenaDimensions: {
                              ...prev.arenaDimensions,
                              length: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Input
                        label="Court width"
                        type="number"
                        step="any"
                        placeholder="e.g. 50"
                        value={formState.arenaDimensions.width}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            arenaDimensions: {
                              ...prev.arenaDimensions,
                              width: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Input
                        label="Court height"
                        type="number"
                        step="any"
                        placeholder="e.g. 20"
                        value={formState.arenaDimensions.height}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            arenaDimensions: {
                              ...prev.arenaDimensions,
                              height: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-xs font-medium text-text-secondary">
                        Unit
                      </label>
                      <select
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                        value={formState.arenaDimensions.unit}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            arenaDimensions: {
                              ...prev.arenaDimensions,
                              unit: e.target.value as "ft" | "m",
                            },
                          }))
                        }
                      >
                        <option value="ft">Feet (ft)</option>
                        <option value="m">Meters (m)</option>
                      </select>
                    </div>
                    <div className="md:col-span-6">
                      <Input
                        label="Per-hour rate"
                        type="number"
                        step="any"
                        placeholder="e.g. 2500"
                        value={formState.arenaPricing.ratePerHour}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            arenaPricing: {
                              ...prev.arenaPricing,
                              ratePerHour: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="md:col-span-6">
                      <Input
                        label="Currency"
                        placeholder="e.g. PKR"
                        value={formState.arenaPricing.currency}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            arenaPricing: {
                              ...prev.arenaPricing,
                              currency: e.target.value.toUpperCase(),
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="md:col-span-12 space-y-1">
                      <label className="text-xs font-medium text-text-secondary">
                        Court size mode
                      </label>
                      <select
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                        value={formState.courtSizeMode}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            courtSizeMode: e.target.value as CourtSizeMode,
                          }))
                        }
                      >
                        <option value="single">Single court</option>
                        <option value="split-two">Two separate courts</option>
                        <option value="double">One double court</option>
                      </select>
                      <p className="text-xs text-text-secondary">
                        Use this to switch between one full court, two separate courts, or one double-sized court.
                      </p>
                    </div>
                  </div>
                </div>
              )}

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