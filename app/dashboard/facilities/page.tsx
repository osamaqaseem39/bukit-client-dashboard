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

/** Facility types supported in this dashboard. */
const FACILITY_TYPES = [
  { value: "gaming-pc", label: "Gaming PC" },
  { value: "ps4", label: "PS4" },
  { value: "ps5", label: "PS5" },
  { value: "xbox", label: "Xbox" },
  { value: "futsal-field", label: "Futsal Field" },
  { value: "cricket-pitch", label: "Cricket Pitch" },
  { value: "padel-court", label: "Padel Court" },
] as const;

type FacilityTypeValue = (typeof FACILITY_TYPES)[number]["value"];
const ARENA_FACILITY_TYPES = ["futsal-field", "cricket-pitch", "padel-court"] as const;
const GAMING_FACILITY_TYPES = ["gaming-pc", "ps4", "ps5", "xbox"] as const;

function isArenaFacilityType(type: string): type is FacilityTypeValue {
  return (ARENA_FACILITY_TYPES as readonly string[]).includes(type);
}

function isGamingFacilityType(type: string): type is FacilityTypeValue {
  return (GAMING_FACILITY_TYPES as readonly string[]).includes(type);
}

function isPcFacilityType(type: string): type is "gaming-pc" {
  return type === "gaming-pc";
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
type GamingPricingMode = "per-minute" | "slabs";

interface PricingSlabEntry {
  id: string;
  minMinutes: string;
  maxMinutes: string;
  price: string;
  currency: string;
}

type CourtSizeMode = "single" | "split-two" | "double";

interface ArenaPricingState {
  ratePerHour: string;
  currency: string;
}

interface GamingPcFacilityMetadataDto {
  pcs?: Array<{
    label?: string;
    cpu?: string;
    gpu?: string;
    ram?: string;
    refresh_rate_hz?: number;
  }>;
  games_available?: string;
  pricing?: {
    per_minute?: {
      rate_per_minute: number;
      currency: string;
      billing_interval_minutes: number;
      minimum_minutes?: number;
    };
    packages?: Array<{
      id: string;
      title: string;
      minutes: number;
      price: number;
      currency: string;
      validity_hours?: number;
    }>;
    slabs?: Array<{
      id: string;
      min_minutes: number;
      max_minutes: number;
      price: number;
      currency: string;
    }>;
  };
}

interface GamingConsoleFacilityMetadataDto {
  stations?: Array<{
    label?: string;
    screen_size_inches?: number;
  }>;
  games_available?: string;
  pricing?: GamingPcFacilityMetadataDto["pricing"];
}

interface ArenaFacilityMetadataDto {
  arena_dimensions?: {
    height: number;
    length: number;
    width: number;
    unit: "ft" | "m";
  };
  court_size_mode?: CourtSizeMode;
  pricing?: {
    per_hour?: {
      rate_per_hour: number;
      currency: string;
    };
  };
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
  selectedPackageIds: string[];
  pricingMode: GamingPricingMode;
  pricingSlabs: PricingSlabEntry[];
  arenaDimensions: {
    height: string;
    length: string;
    width: string;
    unit: "ft" | "m";
  };
  arenaPricing: ArenaPricingState;
  courtSizeMode: CourtSizeMode;
}
type FacilityFormMode = "basic" | "details";

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
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FacilityFormMode>("basic");
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
    selectedPackageIds: [],
    pricingMode: "per-minute",
    pricingSlabs: [],
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

  function openCreateForm(type?: FacilityTypeValue) {
    setFormMode("basic");
    setEditingFacility(null);
    const defaultType = (type ||
      allowedFacilityTypesForLocation[0] ||
      "futsal-field") as FacilityTypeValue;
    setFormState({
      name: "",
      type: defaultType,
      status: "active",
      pcs: [{ label: "PC 1", cpu: "", gpu: "", ram: "", refreshRate: "" }],
      stations: [
        {
          label:
            defaultType === "ps4"
              ? "PS4 Station"
              : defaultType === "ps5"
                ? "PS5 Station"
                : defaultType === "xbox"
                  ? "Xbox Station"
                  : "Station 1",
          screenSizeInches: "",
        },
      ],
      gamesAvailable: "",
      pricingPerMinute: {
        ratePerMinute: "",
        currency: "PKR",
        billingIntervalMinutes: "10",
        minimumMinutes: "",
      },
      pricingPackages: [],
      selectedPackageIds: [],
      pricingMode: "per-minute",
      pricingSlabs: [],
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

  function openBasicEditForm(facility: Facility) {
    setFormMode("basic");
    setEditingFacility(facility);
    setFormState((prev) => ({
      ...prev,
      name: facility.name,
      type: FACILITY_TYPES.some((entry) => entry.value === facility.type)
        ? (facility.type as FacilityTypeValue)
        : "futsal-field",
      status: facility.status,
    }));
    setShowForm(true);
  }

  function openDetailsForm(facility: Facility) {
    setFormMode("details");
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
    const selectedPackageIds =
      pricingPackages.length > 0 ? pricingPackages.map((p) => p.id) : [];
    const slabsRaw = Array.isArray(pricing?.slabs) ? pricing.slabs : [];
    const pricingSlabs: PricingSlabEntry[] = slabsRaw.map((s: any) => ({
      id: String(s?.id || makeId("slab")),
      minMinutes: s?.min_minutes != null ? String(s.min_minutes) : "",
      maxMinutes: s?.max_minutes != null ? String(s.max_minutes) : "",
      price: s?.price != null ? String(s.price) : "",
      currency:
        typeof s?.currency === "string" && s.currency
          ? s.currency
          : pricingPerMinute.currency || "PKR",
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
      type: FACILITY_TYPES.some((entry) => entry.value === facility.type)
        ? (facility.type as FacilityTypeValue)
        : "futsal-field",
      status: facility.status,
      pcs,
      stations,
      gamesAvailable: meta.games_available ?? "",
      pricingPerMinute,
      pricingPackages,
      selectedPackageIds,
      pricingMode: slabsRaw.length > 0 ? "slabs" : "per-minute",
      pricingSlabs,
      arenaDimensions,
      arenaPricing,
      courtSizeMode,
    });
    setShowForm(true);
  }

  function closeForm() {
    setFormMode("basic");
    setShowForm(false);
    setEditingFacility(null);
  }

  function buildGamingMetadata():
    | GamingPcFacilityMetadataDto
    | GamingConsoleFacilityMetadataDto
    | undefined {
    const {
      type,
      pcs,
      stations,
      gamesAvailable,
      pricingPerMinute,
      pricingPackages,
      selectedPackageIds,
      pricingMode,
      pricingSlabs,
    } = formState;
    if (!isGamingFacilityType(type)) return undefined;
    const meta: GamingPcFacilityMetadataDto | GamingConsoleFacilityMetadataDto = {};

    if (isPcFacilityType(type)) {
      const cleanPcs = (pcs || [])
        .slice(0, 1)
        .map((pc) => ({
          label: (pc.label || "").trim(),
          cpu: (pc.cpu || "").trim(),
          gpu: (pc.gpu || "").trim(),
          ram: (pc.ram || "").trim(),
          refresh_rate_hz: pc.refreshRate.trim() ? Number(pc.refreshRate) : undefined,
        }))
        .filter(
          (pc) =>
            pc.label ||
            pc.cpu ||
            pc.gpu ||
            pc.ram ||
            (pc.refresh_rate_hz != null && Number.isFinite(pc.refresh_rate_hz))
        )
        .map((pc) => ({
          ...pc,
          refresh_rate_hz:
            pc.refresh_rate_hz != null && Number.isFinite(pc.refresh_rate_hz)
              ? pc.refresh_rate_hz
              : undefined,
        }));
      if (cleanPcs.length) {
        (meta as GamingPcFacilityMetadataDto).pcs = cleanPcs;
      }
    } else {
      const cleanStations = (stations || [])
        .slice(0, 1)
        .map((station) => ({
          label: (station.label || "").trim(),
          screen_size_inches: station.screenSizeInches.trim()
            ? Number(station.screenSizeInches)
            : undefined,
        }))
        .filter(
          (station) =>
            station.label ||
            (station.screen_size_inches != null && Number.isFinite(station.screen_size_inches))
        )
        .map((station) => ({
          ...station,
          screen_size_inches:
            station.screen_size_inches != null && Number.isFinite(station.screen_size_inches)
              ? station.screen_size_inches
              : undefined,
        }));
      if (cleanStations.length) {
        (meta as GamingConsoleFacilityMetadataDto).stations = cleanStations;
      }
    }

    const games = (gamesAvailable || "").trim();
    if (games) {
      meta.games_available = games;
    }

    const packages: NonNullable<GamingPcFacilityMetadataDto["pricing"]>["packages"] =
      [];
    for (const p of pricingPackages || []) {
      const title = (p.title || "").trim();
      const minutes = p.minutes.trim() ? Number(p.minutes) : NaN;
      const price = p.price.trim() ? Number(p.price) : NaN;
      const currency = (p.currency || "").trim();
      const validity_hours = p.validityHours.trim()
        ? Number(p.validityHours)
        : undefined;
      if (!title && !p.minutes.trim() && !p.price.trim() && !currency) continue;
      if (
        !(
          title &&
          Number.isFinite(minutes) &&
          minutes > 0 &&
          Number.isFinite(price) &&
          price >= 0 &&
          currency
        )
      ) {
        continue;
      }
      packages.push({
        id: p.id || makeId("pkg"),
        title,
        minutes,
        price,
        currency,
        validity_hours:
          validity_hours != null && Number.isFinite(validity_hours) && validity_hours > 0
            ? validity_hours
            : undefined,
      });
    }

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
      Number.isFinite(rate) &&
      rate >= 0 &&
      Number.isFinite(interval) &&
      interval > 0 &&
      currency
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

    const slabs: NonNullable<GamingPcFacilityMetadataDto["pricing"]>["slabs"] = [];
    for (const slab of pricingSlabs || []) {
      const minMinutes = slab.minMinutes.trim() ? Number(slab.minMinutes) : NaN;
      const maxMinutes = slab.maxMinutes.trim() ? Number(slab.maxMinutes) : NaN;
      const price = slab.price.trim() ? Number(slab.price) : NaN;
      const currency = (slab.currency || "").trim();
      if (
        !(
          Number.isFinite(minMinutes) &&
          minMinutes >= 0 &&
          Number.isFinite(maxMinutes) &&
          maxMinutes > minMinutes &&
          Number.isFinite(price) &&
          price >= 0 &&
          currency
        )
      ) {
        continue;
      }
      slabs.push({
        id: slab.id || makeId("slab"),
        min_minutes: minMinutes,
        max_minutes: maxMinutes,
        price,
        currency,
      });
    }

    const selectedPackages =
      packages.length > 0
        ? packages.filter((pkg) => selectedPackageIds.includes(pkg.id))
        : [];

    if (selectedPackages.length || per_minute || slabs.length) {
      meta.pricing = {
        ...(pricingMode === "slabs" && slabs.length ? { slabs } : {}),
        ...(selectedPackages.length ? { packages: selectedPackages } : {}),
        ...(pricingMode === "per-minute" && per_minute ? { per_minute } : {}),
      };
    }
    return Object.keys(meta).length ? meta : undefined;
  }

  function buildArenaMetadata(): ArenaFacilityMetadataDto | undefined {
    const { type, arenaDimensions, arenaPricing, courtSizeMode } = formState;
    if (!isArenaFacilityType(type)) return undefined;
    const meta: ArenaFacilityMetadataDto = {};

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
    return Object.keys(meta).length ? meta : undefined;
  }

  function buildMetadata():
    | GamingPcFacilityMetadataDto
    | GamingConsoleFacilityMetadataDto
    | ArenaFacilityMetadataDto
    | undefined {
    return buildGamingMetadata() || buildArenaMetadata();
  }

  async function handleSave() {
    if (!selectedLocationId) {
      setError("Please select a location first");
      return;
    }

    if (formMode === "basic" && !formState.name.trim()) {
      setError("Facility name is required");
      return;
    }

    if (formMode === "details" && !editingFacility) {
      setError("Select a facility first");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (formMode === "basic") {
        const payload: CreateFacilityPayload = {
          name: formState.name.trim(),
          type: formState.type,
          status: formState.status,
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
      } else {
        await updateFacilityAtLocationApi(
          selectedLocationId,
          editingFacility!.id,
          {
            metadata: buildMetadata(),
          },
        );
      }

      await loadFacilities(selectedLocationId);
      closeForm();
    } catch (err: any) {
      setError(
        err.message ||
          `Failed to ${
            formMode === "details"
              ? "save facility details"
              : editingFacility
                ? "update"
                : "create"
          }`,
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

  async function handleDuplicate(facility: Facility) {
    if (!selectedLocationId) return;
    setDuplicatingId(facility.id);
    setError(null);
    try {
      await createFacilityAtLocationApi(selectedLocationId, {
        name: `${facility.name} Copy`,
        type: facility.type,
        status: facility.status,
        metadata: (facility.metadata || undefined) as Record<string, any> | undefined,
      });
      await loadFacilities(selectedLocationId);
    } catch (err: any) {
      setError(err.message || "Failed to duplicate facility");
    } finally {
      setDuplicatingId(null);
    }
  }

  const selectedLocation = useMemo(
    () => locations.find((loc) => loc.id === selectedLocationId) || null,
    [locations, selectedLocationId],
  );
  const allowedFacilityTypesForLocation = useMemo(() => {
    const assigned = selectedLocation?.facility_types || [];
    if (!assigned || assigned.length === 0) return FACILITY_TYPES.map((f) => f.value);

    const mapped = new Set<string>();
    for (const t of assigned) {
      if (t === "arena") {
        for (const arenaType of ARENA_FACILITY_TYPES) mapped.add(arenaType);
        continue;
      }
      if (t === "gaming-zone") {
        for (const gamingType of GAMING_FACILITY_TYPES) mapped.add(gamingType);
        continue;
      }
      mapped.add(t);
    }
    const filtered = FACILITY_TYPES.map((f) => f.value).filter((type) => mapped.has(type));
    return filtered.length ? filtered : FACILITY_TYPES.map((f) => f.value);
  }, [selectedLocation]);

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
          <div className="flex flex-wrap gap-2">
            {FACILITY_TYPES.filter((opt) =>
              allowedFacilityTypesForLocation.includes(opt.value)
            ).map((opt) => (
              <Button
                key={opt.value}
                variant="secondary"
                onClick={() => openCreateForm(opt.value)}
                disabled={!selectedLocationId || loadingLocations}
              >
                <Plus className="mr-2 h-4 w-4" />
                {`Add ${opt.label}`}
              </Button>
            ))}
          </div>
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
                        onClick={() => openBasicEditForm(facility)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openDetailsForm(facility)}
                      >
                        Configure
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDuplicate(facility)}
                        disabled={duplicatingId === facility.id}
                      >
                        {duplicatingId === facility.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
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
              {formMode === "basic"
                ? editingFacility
                  ? "Edit Facility"
                  : "Add Facility"
                : `Configure ${editingFacility?.name || "Facility"} Details`}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {formMode === "basic"
                ? editingFacility
                  ? "Update basic facility information."
                  : "Create the facility first. Then configure details separately."
                : "Fill the dedicated details form for this facility type and save."}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formMode === "basic" && (
                <>
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
                      {editingFacility ? (
                        <select
                          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                          value={formState.type}
                          onChange={(e) => {
                            const newType = e.target.value as FacilityTypeValue;
                            setFormState((prev) => ({ ...prev, type: newType }));
                          }}
                        >
                          {FACILITY_TYPES.filter((opt) =>
                            allowedFacilityTypesForLocation.includes(opt.value)
                          ).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary">
                          {FACILITY_TYPES.find((opt) => opt.value === formState.type)?.label ||
                            formState.type}
                        </div>
                      )}
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
                </>
              )}

              {formMode === "details" && isGamingFacilityType(formState.type) && (
                <div className="space-y-4 rounded-lg border border-border bg-surface/50 p-4">
                  <div className="text-sm font-medium text-text-primary">
                    Gaming zone setup details
                  </div>

                  {isPcFacilityType(formState.type) ? (
                    <div className="space-y-3">
                      <div className="text-xs font-medium text-text-secondary">PC specs</div>
                      {formState.pcs.slice(0, 1).map((pc, idx) => (
                        <div key={`${pc.label}_${idx}`} className="rounded-md border border-border p-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            <Input
                              label="PC label"
                              value={pc.label}
                              onChange={(e) =>
                                setFormState((prev) => ({
                                  ...prev,
                                  pcs: prev.pcs.map((entry, i) =>
                                    i === idx ? { ...entry, label: e.target.value } : entry
                                  ),
                                }))
                              }
                            />
                            <Input
                              label="CPU"
                              value={pc.cpu}
                              onChange={(e) =>
                                setFormState((prev) => ({
                                  ...prev,
                                  pcs: prev.pcs.map((entry, i) =>
                                    i === idx ? { ...entry, cpu: e.target.value } : entry
                                  ),
                                }))
                              }
                            />
                            <Input
                              label="GPU"
                              value={pc.gpu}
                              onChange={(e) =>
                                setFormState((prev) => ({
                                  ...prev,
                                  pcs: prev.pcs.map((entry, i) =>
                                    i === idx ? { ...entry, gpu: e.target.value } : entry
                                  ),
                                }))
                              }
                            />
                            <Input
                              label="RAM"
                              value={pc.ram}
                              onChange={(e) =>
                                setFormState((prev) => ({
                                  ...prev,
                                  pcs: prev.pcs.map((entry, i) =>
                                    i === idx ? { ...entry, ram: e.target.value } : entry
                                  ),
                                }))
                              }
                            />
                            <Input
                              label="Refresh rate (Hz)"
                              type="number"
                              step="1"
                              value={pc.refreshRate}
                              onChange={(e) =>
                                setFormState((prev) => ({
                                  ...prev,
                                  pcs: prev.pcs.map((entry, i) =>
                                    i === idx
                                      ? { ...entry, refreshRate: e.target.value }
                                      : entry
                                  ),
                                }))
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-xs font-medium text-text-secondary">
                        Console station details
                      </div>
                      {formState.stations.slice(0, 1).map((station, idx) => (
                        <div
                          key={`${station.label}_${idx}`}
                          className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-2"
                        >
                          <Input
                            label="Station label"
                            value={station.label}
                            onChange={(e) =>
                              setFormState((prev) => ({
                                ...prev,
                                stations: prev.stations.map((entry, i) =>
                                  i === idx ? { ...entry, label: e.target.value } : entry
                                ),
                              }))
                            }
                          />
                          <Input
                            label="Screen size (inches)"
                            type="number"
                            step="any"
                            value={station.screenSizeInches}
                            onChange={(e) =>
                              setFormState((prev) => ({
                                ...prev,
                                stations: prev.stations.map((entry, i) =>
                                  i === idx
                                    ? { ...entry, screenSizeInches: e.target.value }
                                    : entry
                                ),
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <Input
                    label="Games available (comma separated)"
                    placeholder="e.g. FC 25, Tekken 8, Valorant"
                    value={formState.gamesAvailable}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        gamesAvailable: e.target.value,
                      }))
                    }
                  />

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text-secondary">
                      Pricing mode
                    </label>
                    <select
                      className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                      value={formState.pricingMode}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          pricingMode: e.target.value as GamingPricingMode,
                        }))
                      }
                    >
                      <option value="per-minute">Per-minute + packages</option>
                      <option value="slabs">Pricing slabs</option>
                    </select>
                  </div>

                  {formState.pricingMode === "per-minute" ? (
                    <>
                      <div className="grid gap-3 md:grid-cols-4">
                        <Input
                          label="Per-minute rate"
                          type="number"
                          step="any"
                          value={formState.pricingPerMinute.ratePerMinute}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              pricingPerMinute: {
                                ...prev.pricingPerMinute,
                                ratePerMinute: e.target.value,
                              },
                            }))
                          }
                        />
                        <Input
                          label="Currency"
                          value={formState.pricingPerMinute.currency}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              pricingPerMinute: {
                                ...prev.pricingPerMinute,
                                currency: e.target.value.toUpperCase(),
                              },
                            }))
                          }
                        />
                        <Input
                          label="Billing interval (min)"
                          type="number"
                          step="1"
                          value={formState.pricingPerMinute.billingIntervalMinutes}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              pricingPerMinute: {
                                ...prev.pricingPerMinute,
                                billingIntervalMinutes: e.target.value,
                              },
                            }))
                          }
                        />
                        <Input
                          label="Minimum minutes"
                          type="number"
                          step="1"
                          value={formState.pricingPerMinute.minimumMinutes}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              pricingPerMinute: {
                                ...prev.pricingPerMinute,
                                minimumMinutes: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>

                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-text-secondary">
                          Pricing slabs
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setFormState((prev) => ({
                              ...prev,
                              pricingSlabs: [
                                ...prev.pricingSlabs,
                                {
                                  id: makeId("slab"),
                                  minMinutes: "",
                                  maxMinutes: "",
                                  price: "",
                                  currency: prev.pricingPerMinute.currency || "PKR",
                                },
                              ],
                            }))
                          }
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Add Slab
                        </Button>
                      </div>
                      {formState.pricingSlabs.map((slab, idx) => (
                        <div
                          key={slab.id}
                          className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-5"
                        >
                          <Input
                            label="Min minutes"
                            type="number"
                            step="1"
                            value={slab.minMinutes}
                            onChange={(e) =>
                              setFormState((prev) => ({
                                ...prev,
                                pricingSlabs: prev.pricingSlabs.map((entry, i) =>
                                  i === idx ? { ...entry, minMinutes: e.target.value } : entry
                                ),
                              }))
                            }
                          />
                          <Input
                            label="Max minutes"
                            type="number"
                            step="1"
                            value={slab.maxMinutes}
                            onChange={(e) =>
                              setFormState((prev) => ({
                                ...prev,
                                pricingSlabs: prev.pricingSlabs.map((entry, i) =>
                                  i === idx ? { ...entry, maxMinutes: e.target.value } : entry
                                ),
                              }))
                            }
                          />
                          <Input
                            label="Price"
                            type="number"
                            step="any"
                            value={slab.price}
                            onChange={(e) =>
                              setFormState((prev) => ({
                                ...prev,
                                pricingSlabs: prev.pricingSlabs.map((entry, i) =>
                                  i === idx ? { ...entry, price: e.target.value } : entry
                                ),
                              }))
                            }
                          />
                          <Input
                            label="Currency"
                            value={slab.currency}
                            onChange={(e) =>
                              setFormState((prev) => ({
                                ...prev,
                                pricingSlabs: prev.pricingSlabs.map((entry, i) =>
                                  i === idx
                                    ? { ...entry, currency: e.target.value.toUpperCase() }
                                    : entry
                                ),
                              }))
                            }
                          />
                          <div className="flex items-end justify-end">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                setFormState((prev) => ({
                                  ...prev,
                                  pricingSlabs: prev.pricingSlabs.filter((_, i) => i !== idx),
                                }))
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2 rounded-md border border-border p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-text-primary">
                        Facility packages (multi-select)
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const newId = makeId("pkg");
                          setFormState((prev) => ({
                            ...prev,
                            pricingPackages: [
                              ...prev.pricingPackages,
                              {
                                id: newId,
                                title: "",
                                minutes: "",
                                price: "",
                                currency: prev.pricingPerMinute.currency || "PKR",
                                validityHours: "",
                              },
                            ],
                            selectedPackageIds: [...prev.selectedPackageIds, newId],
                          }));
                        }}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Add Package
                      </Button>
                    </div>

                    {formState.pricingPackages.length === 0 && (
                      <p className="text-xs text-text-secondary">
                        No packages yet. Add package options and select the ones to activate for this facility.
                      </p>
                    )}

                    {formState.pricingPackages.map((pkg, idx) => (
                      <div
                        key={pkg.id}
                        className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-6"
                      >
                        <div className="md:col-span-2 space-y-1">
                          <label className="inline-flex items-center gap-2 text-xs font-medium text-text-secondary">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-border"
                              checked={formState.selectedPackageIds.includes(pkg.id)}
                              onChange={(e) =>
                                setFormState((prev) => ({
                                  ...prev,
                                  selectedPackageIds: e.target.checked
                                    ? [...prev.selectedPackageIds, pkg.id]
                                    : prev.selectedPackageIds.filter((id) => id !== pkg.id),
                                }))
                              }
                            />
                            Select for this facility
                          </label>
                          <Input
                            label="Title"
                            value={pkg.title}
                            onChange={(e) =>
                              setFormState((prev) => ({
                                ...prev,
                                pricingPackages: prev.pricingPackages.map((entry, i) =>
                                  i === idx ? { ...entry, title: e.target.value } : entry
                                ),
                              }))
                            }
                          />
                        </div>
                        <Input
                          label="Minutes"
                          type="number"
                          step="1"
                          value={pkg.minutes}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              pricingPackages: prev.pricingPackages.map((entry, i) =>
                                i === idx ? { ...entry, minutes: e.target.value } : entry
                              ),
                            }))
                          }
                        />
                        <Input
                          label="Price"
                          type="number"
                          step="any"
                          value={pkg.price}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              pricingPackages: prev.pricingPackages.map((entry, i) =>
                                i === idx ? { ...entry, price: e.target.value } : entry
                              ),
                            }))
                          }
                        />
                        <Input
                          label="Currency"
                          value={pkg.currency}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              pricingPackages: prev.pricingPackages.map((entry, i) =>
                                i === idx
                                  ? { ...entry, currency: e.target.value.toUpperCase() }
                                  : entry
                              ),
                            }))
                          }
                        />
                        <div className="space-y-1">
                          <Input
                            label="Validity (hours)"
                            type="number"
                            step="1"
                            value={pkg.validityHours}
                            onChange={(e) =>
                              setFormState((prev) => ({
                                ...prev,
                                pricingPackages: prev.pricingPackages.map((entry, i) =>
                                  i === idx
                                    ? { ...entry, validityHours: e.target.value }
                                    : entry
                                ),
                              }))
                            }
                          />
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                const cloneId = makeId("pkg-copy");
                                setFormState((prev) => ({
                                  ...prev,
                                  pricingPackages: [
                                    ...prev.pricingPackages,
                                    { ...pkg, id: cloneId },
                                  ],
                                  selectedPackageIds: [...prev.selectedPackageIds, cloneId],
                                }));
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                setFormState((prev) => ({
                                  ...prev,
                                  pricingPackages: prev.pricingPackages.filter((_, i) => i !== idx),
                                  selectedPackageIds: prev.selectedPackageIds.filter(
                                    (id) => id !== pkg.id
                                  ),
                                }))
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formMode === "details" && isArenaFacilityType(formState.type) && (
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
                    formMode === "basic"
                      ? editingFacility
                        ? "Save Basic Info"
                        : "Create Facility"
                      : "Save Details"
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