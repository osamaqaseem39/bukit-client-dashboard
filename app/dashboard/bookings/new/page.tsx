"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  createBookingApi,
  getLocationsApi,
  getFacilitiesByLocationApi,
} from "@/lib/api";
import type { Location, Facility } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/** One bookable unit: either the whole facility or a sub-unit (e.g. PC 1, PC 2). */
export interface BookableUnit {
  facilityId: string;
  locationId: string;
  unitIndex: number;
  label: string;
  facilityName: string;
  facilityType: string;
}

function getUnitsFromFacility(facility: Facility): BookableUnit[] {
  const meta = facility.metadata as Record<string, any> | undefined;
  if (facility.type === "gaming-pc" && meta?.pcs && Array.isArray(meta.pcs)) {
    return meta.pcs.map((pc: any, index: number) => ({
      facilityId: facility.id,
      locationId: facility.location_id,
      unitIndex: index,
      label: pc.label || `PC ${index + 1}`,
      facilityName: facility.name,
      facilityType: facility.type,
    }));
  }
  if (
    (facility.type === "ps4" || facility.type === "ps5" || facility.type === "xbox") &&
    meta?.stations &&
    Array.isArray(meta.stations)
  ) {
    return meta.stations.map((s: any, index: number) => ({
      facilityId: facility.id,
      locationId: facility.location_id,
      unitIndex: index,
      label: typeof s === "string" ? s : s?.label || `${facility.type} ${index + 1}`,
      facilityName: facility.name,
      facilityType: facility.type,
    }));
  }
  return [
    {
      facilityId: facility.id,
      locationId: facility.location_id,
      unitIndex: 0,
      label: facility.name,
      facilityName: facility.name,
      facilityType: facility.type,
    },
  ];
}

function unitKey(unit: BookableUnit): string {
  return `${unit.facilityId}:${unit.unitIndex}`;
}

/** Today's date in local time as YYYY-MM-DD. */
function todayLocalDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Current time rounded up to the next 5-minute interval (e.g. 14:23 → 14:25). */
function nextFiveMinTime(): string {
  const d = new Date();
  const mins = d.getMinutes();
  let hours = d.getHours();
  const roundedMins = Math.ceil(mins / 5) * 5;
  if (roundedMins >= 60) {
    hours += 1;
    return `${String(hours).padStart(2, "0")}:00`;
  }
  return `${String(hours).padStart(2, "0")}:${String(roundedMins).padStart(2, "0")}`;
}

export default function NewBookingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isLocationManager =
    user?.role === "location_manager" && Boolean(user?.managed_location_id);
  const managedLocationId = user?.managed_location_id ?? null;

  const [locations, setLocations] = useState<Location[]>([]);
  const [facilitiesByLocation, setFacilitiesByLocation] = useState<
    Record<string, Facility[]>
  >({});
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedFacilityIds, setSelectedFacilityIds] = useState<string[]>([]);
  const [selectedUnitKeys, setSelectedUnitKeys] = useState<string[]>([]);
  const [date, setDate] = useState<string>(() => todayLocalDate());
  const [startTime, setStartTime] = useState<string>(() => nextFiveMinTime());
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [guestName, setGuestName] = useState<string>("");
  const [guestPhone, setGuestPhone] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Location manager: lock to their managed location
  useEffect(() => {
    if (isLocationManager && managedLocationId) {
      setSelectedLocationIds([managedLocationId]);
    }
  }, [isLocationManager, managedLocationId]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const locs = await getLocationsApi(undefined);
        if (!isMounted) return;
        setLocations(locs);
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load locations");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadFacilities() {
      if (selectedLocationIds.length === 0) {
        setFacilitiesByLocation({});
        setSelectedFacilityIds([]);
        setSelectedUnitKeys([]);
        return;
      }
      const next: Record<string, Facility[]> = {};
      try {
        await Promise.all(
          selectedLocationIds.map(async (locId) => {
            const list = await getFacilitiesByLocationApi(locId);
            if (isMounted) next[locId] = list;
          })
        );
        if (isMounted) {
          setFacilitiesByLocation(next);
          if (!isLocationManager) {
            setSelectedFacilityIds([]);
            setSelectedUnitKeys([]);
          } else if (managedLocationId && next[managedLocationId]?.length === 1) {
            setSelectedFacilityIds([next[managedLocationId][0].id]);
            setSelectedUnitKeys([]);
          } else {
            setSelectedFacilityIds([]);
            setSelectedUnitKeys([]);
          }
        }
      } catch {
        if (isMounted) setFacilitiesByLocation({});
      }
    }
    loadFacilities();
    return () => {
      isMounted = false;
    };
  }, [selectedLocationIds.join(","), isLocationManager, managedLocationId]);

  const toggleLocation = (id: string) => {
    setSelectedLocationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleFacility = (id: string) => {
    setSelectedFacilityIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setSelectedUnitKeys((prev) =>
      prev.filter((k) => !k.startsWith(`${id}:`))
    );
  };

  const allFacilities = useMemo(() => {
    return Object.values(facilitiesByLocation).flat();
  }, [facilitiesByLocation]);

  const selectedFacilities = useMemo(
    () => allFacilities.filter((f) => selectedFacilityIds.includes(f.id)),
    [allFacilities, selectedFacilityIds]
  );

  const allUnits = useMemo(() => {
    return selectedFacilities.flatMap(getUnitsFromFacility);
  }, [selectedFacilities]);

  const toggleUnit = (key: string) => {
    setSelectedUnitKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectAllUnits = () => {
    setSelectedUnitKeys(allUnits.map(unitKey));
  };

  const clearUnits = () => {
    setSelectedUnitKeys([]);
  };

  function buildDateTime(): { start: Date; end: Date } {
    const [hours, minutes] = startTime.split(":").map((v) => parseInt(v, 10));
    const start = new Date(date);
    start.setHours(hours || 0, minutes || 0, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    return { start, end };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedUnitKeys.length === 0 || !guestName || !guestPhone) {
      setError(
        "Select at least one location, facility and unit (e.g. PC or station), and enter guest name and phone."
      );
      return;
    }

    const { start, end } = buildDateTime();
    const unitsToBook = allUnits.filter((u) =>
      selectedUnitKeys.includes(unitKey(u))
    );

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      for (const unit of unitsToBook) {
        await createBookingApi({
          location_id: unit.locationId,
          facility_id: unit.facilityId,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          is_walk_in: true,
          guest_name: guestName,
          guest_phone: guestPhone,
        });
      }
      setSuccess(
        `${unitsToBook.length} walk-in booking(s) created successfully.`
      );
      setTimeout(() => {
        router.push("/dashboard/bookings");
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to create booking(s)");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
      </div>
    );
  }

  const toggleBtn = (selected: boolean) =>
    selected
      ? "rounded-lg border-2 border-primary bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90"
      : "rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          New walk-in booking
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {isLocationManager
            ? "Select units (e.g. PC, PS5), then time and guest. Location and facility are set for you."
            : "Select locations, facilities and units (e.g. PC, PS5), then time and guest."}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-success/40 bg-success/5 px-4 py-3 text-sm text-success">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-text-primary">
            Booking details
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {isLocationManager
              ? "Choose units (PC, PS5, etc.) and time, then enter guest details. Select multiple units to book at once."
              : "Choose locations, facilities and units (PC, PS5, etc.) by tapping the buttons; select multiple to book at once."}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Locations – only for client (location manager has location pre-selected) */}
            {!isLocationManager && (
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
                  Locations *
                </label>
                <div className="flex flex-wrap gap-2">
                  {locations.map((loc) => {
                    const selected = selectedLocationIds.includes(loc.id);
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => toggleLocation(loc.id)}
                        className={toggleBtn(selected)}
                      >
                        {loc.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Facilities – only for client, or for location manager when more than one facility */}
            {selectedLocationIds.length > 0 &&
              (!isLocationManager ||
                (managedLocationId &&
                  (facilitiesByLocation[managedLocationId]?.length ?? 0) > 1)) && (
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
                  Facilities *
                </label>
                <div className="space-y-4">
                  {selectedLocationIds.map((locId) => {
                    const loc = locations.find((l) => l.id === locId);
                    const facs = facilitiesByLocation[locId] || [];
                    if (facs.length === 0) return null;
                    return (
                      <div
                        key={locId}
                        className="rounded-xl border border-gray-200 bg-gray-50/50 p-4"
                      >
                        <div className="mb-2 text-sm font-semibold text-gray-700">
                          {loc?.name}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {facs.map((f) => {
                            const selected = selectedFacilityIds.includes(f.id);
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => toggleFacility(f.id)}
                                className={toggleBtn(selected)}
                              >
                                {f.name}{" "}
                                <span
                                  className={
                                    selected
                                      ? "rounded-full bg-white/30 px-1.5 py-0.5 text-xs uppercase"
                                      : "rounded-full bg-gray-200 px-1.5 py-0.5 text-xs uppercase text-gray-600"
                                  }
                                >
                                  {f.type}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Units (PC, PS5, etc.) – button toggles */}
            {selectedFacilities.length > 0 && allUnits.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                    Units to book (e.g. PC 1, PC 2, PS5) *
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={selectAllUnits}
                    >
                      Select all
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={clearUnits}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                  {selectedFacilities.map((facility) => {
                    const units = getUnitsFromFacility(facility);
                    return (
                      <div key={facility.id}>
                        <div className="mb-1.5 text-sm font-semibold text-gray-800">
                          {facility.name}{" "}
                          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-normal uppercase text-gray-600">
                            {facility.type}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {units.map((unit) => {
                            const key = unitKey(unit);
                            const selected = selectedUnitKeys.includes(key);
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => toggleUnit(key)}
                                className={toggleBtn(selected)}
                              >
                                {unit.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {selectedUnitKeys.length > 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    {selectedUnitKeys.length} unit(s) selected — one booking per unit for the same time and guest.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  type="time"
                  label="Start time *"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
                <Input
                  type="number"
                  label="Duration (minutes) *"
                  min={15}
                  step={15}
                  value={durationMinutes}
                  onChange={(e) =>
                    setDurationMinutes(Number(e.target.value || 60))
                  }
                />
              </div>
              <p className="text-xs text-text-secondary">
                Date is set to today automatically.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Quick add
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setDurationMinutes((prev) => Math.max(15, prev - 30))
                  }
                >
                  - 30 min
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setDurationMinutes((prev) => Math.max(15, prev + 30))
                  }
                >
                  + 30 min
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Guest name *"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
              <Input
                label="Guest phone *"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/dashboard/bookings")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || selectedUnitKeys.length === 0}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating {selectedUnitKeys.length} booking(s)…
                  </>
                ) : (
                  `Create ${selectedUnitKeys.length || ""} booking(s)`.trim() ||
                  "Create booking"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
