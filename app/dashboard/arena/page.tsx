"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapPin, Search } from "lucide-react";
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
import type { Facility, FacilityStatus, Location } from "@/lib/api";
import {
  type Booking,
  createBookingApi,
  getBookingsApi,
  getFacilitiesByLocationApi,
  getLocationsApi,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";

const ARENA_FACILITY_TYPES = new Set<string>([
  "futsal-field",
  "cricket-pitch",
  "padel-court",
]);

const ARENA_TYPE_LABELS: Record<string, string> = {
  "futsal-field": "Futsal Field",
  "cricket-pitch": "Cricket Pitch",
  "padel-court": "Padel Court",
};

function formatArenaType(type: string) {
  return ARENA_TYPE_LABELS[type] || type;
}

function formatStatus(status: FacilityStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function ArenaPage() {
  const { isClient } = useAuth();
  const searchParams = useSearchParams();

  const clientId = isClient() ? undefined : searchParams.get("clientId") || undefined;

  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArenaType, setSelectedArenaType] = useState<string>("");
  const [quickBookingFacility, setQuickBookingFacility] =
    useState<Facility | null>(null);
  const [quickDurationMinutes, setQuickDurationMinutes] = useState<number>(60);
  const [quickGuestName, setQuickGuestName] = useState<string>("");
  const [quickGuestPhone, setQuickGuestPhone] = useState<string>("");
  const [quickStart, setQuickStart] = useState<string>("");
  const [quickEnd, setQuickEnd] = useState<string>("");
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickSelectedPackageId, setQuickSelectedPackageId] =
    useState<string>("");

  useEffect(() => {
    let isMounted = true;
    setLocationsLoading(true);
    setError(null);
    getLocationsApi(clientId)
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
  }, [clientId]);

  useEffect(() => {
    if (!selectedLocationId) {
      setFacilities([]);
      setBookings([]);
      return;
    }
    let isMounted = true;
    setFacilitiesLoading(true);
    setBookingsLoading(true);
    setError(null);
    Promise.allSettled([
      getFacilitiesByLocationApi(selectedLocationId),
      getBookingsApi(),
    ])
      .then(([facilitiesRes, bookingsRes]) => {
        if (!isMounted) return;

        if (facilitiesRes.status === "fulfilled") {
          setFacilities(
            facilitiesRes.value.filter((f) => ARENA_FACILITY_TYPES.has(f.type))
          );
        } else if (facilitiesRes.status === "rejected") {
          setError(
            facilitiesRes.reason?.message ||
              "Failed to load arena facilities",
          );
        }

        if (bookingsRes.status === "fulfilled") {
          const allBookings = bookingsRes.value || [];
          setBookings(
            allBookings.filter(
              (b) => b.location_id === selectedLocationId,
            ),
          );
        } else if (bookingsRes.status === "rejected") {
          setError(
            bookingsRes.reason?.message || "Failed to load bookings",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setFacilitiesLoading(false);
          setBookingsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [selectedLocationId]);

  function findCurrentBookingForFacility(facilityId: string) {
    const now = new Date();
    return bookings.find((b) => {
      if (b.facility_id !== facilityId) return false;
      const start = new Date(b.start_time);
      const end = new Date(b.end_time);
      return (
        b.status === "confirmed" &&
        start.getTime() <= now.getTime() &&
        end.getTime() >= now.getTime()
      );
    });
  }

  async function handleQuickWalkInSubmit() {
    if (!quickBookingFacility) return;
    try {
      setBookingsLoading(true);
      setQuickError(null);

      const startDate = quickStart ? new Date(quickStart) : new Date();
      const endDate = quickEnd
        ? new Date(quickEnd)
        : new Date(startDate.getTime() + quickDurationMinutes * 60 * 1000);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        setQuickError("Please provide valid start and end times.");
        return;
      }

      if (endDate.getTime() <= startDate.getTime()) {
        setQuickError("End time must be after start time.");
        return;
      }

      const overlapping = bookings.some((b) => {
        if (b.facility_id !== quickBookingFacility.id) return false;
        if (b.status === "cancelled") return false;
        const existingStart = new Date(b.start_time);
        const existingEnd = new Date(b.end_time);
        if (
          isNaN(existingStart.getTime()) ||
          isNaN(existingEnd.getTime())
        ) {
          return false;
        }
        return (
          startDate.getTime() < existingEnd.getTime() &&
          endDate.getTime() > existingStart.getTime()
        );
      });

      if (overlapping) {
        setQuickError(
          "This facility already has a booking in the selected time slot.",
        );
        return;
      }

      const newBooking = await createBookingApi({
        location_id: quickBookingFacility.location_id,
        facility_id: quickBookingFacility.id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: "confirmed",
        is_walk_in: true,
        guest_name: quickGuestName || undefined,
        guest_phone: quickGuestPhone || undefined,
        amount:
          typeof quickBookingFacility.metadata?.packages === "object" &&
          Array.isArray(quickBookingFacility.metadata.packages)
            ? quickBookingFacility.metadata.packages.find(
                (p: any) => p.id === quickSelectedPackageId,
              )?.price ?? undefined
            : undefined,
        currency:
          typeof quickBookingFacility.metadata?.packages === "object" &&
          Array.isArray(quickBookingFacility.metadata.packages)
            ? quickBookingFacility.metadata.packages.find(
                (p: any) => p.id === quickSelectedPackageId,
              )?.currency ?? undefined
            : undefined,
      });

      setBookings((prev) => [newBooking, ...prev]);
      setQuickBookingFacility(null);
      setQuickGuestName("");
      setQuickGuestPhone("");
      setQuickStart("");
      setQuickEnd("");
      setQuickSelectedPackageId("");
    } catch (err: any) {
      setError(err.message || "Failed to create walk-in booking");
    } finally {
      setBookingsLoading(false);
    }
  }

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === selectedLocationId) ?? null,
    [locations, selectedLocationId]
  );

  const filteredFacilities = useMemo(() => {
    return facilities.filter((facility) => {
      const matchesSearch =
        !searchQuery ||
        facility.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType =
        !selectedArenaType || facility.type === selectedArenaType;
      return matchesSearch && matchesType;
    });
  }, [facilities, searchQuery, selectedArenaType]);

  const stats = useMemo(() => {
    const total = facilities.length;
    const active = facilities.filter((f) => f.status === "active").length;
    const maintenance = facilities.filter(
      (f) => f.status === "maintenance"
    ).length;
    const occupiedNow = facilities.filter((f) =>
      Boolean(findCurrentBookingForFacility(f.id)),
    ).length;
    return { total, active, maintenance, occupiedNow };
  }, [facilities, bookings]);

  const arenaTypeOptions = Array.from(ARENA_FACILITY_TYPES);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          Arena
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          View and manage arena facilities (cricket, futsal, padel) per location.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-text-primary">
            Select location
          </h2>
          <p className="text-sm text-text-secondary">
            Choose a location to see its arena facilities.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {locationsLoading ? (
              <div className="flex items-center justify-center py-6 text-sm text-text-secondary">
                Loading locations…
              </div>
            ) : locations.length === 0 ? (
              <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-text-secondary">
                No locations found. Please create a location first in setup.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {locations.map((loc) => {
                  const isSelected = loc.id === selectedLocationId;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => setSelectedLocationId(loc.id)}
                      className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left text-sm transition ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-surface-elevated/60 hover:border-primary/60 hover:bg-surface-elevated"
                      }`}
                    >
                      <div className="mb-1 flex w-full items-center justify-between gap-2">
                        <span className="font-medium text-text-primary">
                          {loc.name}
                        </span>
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                            isSelected
                              ? "border-primary bg-primary text-white"
                              : "border-border bg-background text-transparent"
                          } text-[10px] font-bold`}
                        >
                          ✓
                        </span>
                      </div>
                      {(loc.city || loc.address) && (
                        <span className="text-xs text-text-secondary">
                          {loc.city || loc.address}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
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
              Then you can view arena facilities (cricket, futsal, padel) for that location.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedLocationId && (
        <>
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
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-text-secondary">
                  Occupied now
                </p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {stats.occupiedNow}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row">
                <Input
                  type="search"
                  placeholder="Search arena facilities by name..."
                  icon={<Search className="h-4 w-4" />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <div className="w-full sm:w-48">
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Arena type
                  </label>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={selectedArenaType}
                    onChange={(e) => setSelectedArenaType(e.target.value)}
                  >
                    <option value="">All</option>
                    {arenaTypeOptions.map((value) => (
                      <option key={value} value={value}>
                        {formatArenaType(value)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-text-primary">
                {selectedLocation
                  ? `Arena facilities at ${selectedLocation.name}`
                  : "Arena facilities"}
              </h2>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Arena type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Current booking</TableHead>
                    <TableHead className="text-right">
                      Quick actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facilitiesLoading && filteredFacilities.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-text-secondary"
                      >
                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                      </TableCell>
                    </TableRow>
                  )}
                  {!facilitiesLoading &&
                    filteredFacilities.map((facility) => {
                      const currentBooking = findCurrentBookingForFacility(
                        facility.id,
                      );
                      return (
                        <TableRow key={facility.id}>
                          <TableCell className="font-medium">
                            {facility.name}
                          </TableCell>
                          <TableCell>
                            {formatArenaType(facility.type)}
                          </TableCell>
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
                            {facility.capacity != null
                              ? facility.capacity
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {currentBooking ? (
                              <div className="flex flex-col text-xs">
                                <span className="font-medium">
                                  {new Date(
                                    currentBooking.start_time,
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}{" "}
                                  -{" "}
                                  {new Date(
                                    currentBooking.end_time,
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {currentBooking.is_walk_in && (
                                  <span className="text-[11px] text-text-secondary">
                                    Walk-in
                                  </span>
                                )}
                              </div>
                            ) : bookingsLoading ? (
                              <span className="text-xs text-text-secondary">
                                Checking…
                              </span>
                            ) : (
                              <span className="text-xs text-success">
                                Available
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setQuickBookingFacility(facility);
                                setQuickDurationMinutes(60);
                                setQuickError(null);
                                setQuickSelectedPackageId("");
                                const now = new Date();
                                const inOneHour = new Date(
                                  now.getTime() + 60 * 60 * 1000,
                                );
                                const toLocalInput = (d: Date) =>
                                  `${d.getFullYear()}-${String(
                                    d.getMonth() + 1,
                                  ).padStart(2, "0")}-${String(
                                    d.getDate(),
                                  ).padStart(2, "0")}T${String(
                                    d.getHours(),
                                  ).padStart(2, "0")}:${String(
                                    d.getMinutes(),
                                  ).padStart(2, "0")}`;
                                setQuickStart(toLocalInput(now));
                                setQuickEnd(toLocalInput(inOneHour));
                              }}
                              className="inline-flex items-center rounded-md bg-primary px-3 py-1 text-xs font-medium text-white shadow-sm transition hover:bg-primary/90"
                            >
                              Quick book
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {!facilitiesLoading && filteredFacilities.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-text-secondary"
                      >
                        No arena facilities yet for this location.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
      {quickBookingFacility && (
        <Modal
          isOpen={!!quickBookingFacility}
          onClose={() => {
            if (bookingsLoading) return;
            setQuickBookingFacility(null);
            setQuickError(null);
            setQuickSelectedPackageId("");
          }}
          title={`Quick book - ${quickBookingFacility.name}`}
          size="md"
        >
          <div className="space-y-4">
            {quickBookingFacility.metadata &&
              Array.isArray(
                (quickBookingFacility.metadata as any).packages,
              ) && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-text-secondary">
                    Package
                  </label>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={quickSelectedPackageId}
                    onChange={(e) => {
                      const value = e.target.value;
                      setQuickSelectedPackageId(value);
                      const pk =
                        (quickBookingFacility.metadata as any).packages.find(
                          (p: any) => p.id === value,
                        );
                      if (pk && typeof pk.duration_minutes === "number") {
                        setQuickDurationMinutes(pk.duration_minutes);
                        if (quickStart) {
                          const base = new Date(quickStart);
                          if (!isNaN(base.getTime())) {
                            const newEnd = new Date(
                              base.getTime() +
                                pk.duration_minutes * 60 * 1000,
                            );
                            const toLocalInput = (d: Date) =>
                              `${d.getFullYear()}-${String(
                                d.getMonth() + 1,
                              ).padStart(2, "0")}-${String(
                                d.getDate(),
                              ).padStart(2, "0")}T${String(
                                d.getHours(),
                              ).padStart(2, "0")}:${String(
                                d.getMinutes(),
                              ).padStart(2, "0")}`;
                            setQuickEnd(toLocalInput(newEnd));
                          }
                        }
                      }
                    }}
                  >
                    <option value="">No package</option>
                    {(quickBookingFacility.metadata as any).packages.map(
                      (p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name}{" "}
                          {typeof p.duration_minutes === "number"
                            ? `- ${p.duration_minutes} min`
                            : ""}{" "}
                          {typeof p.price === "number"
                            ? `- ${p.price} ${p.currency ?? ""}`
                            : ""}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              )}
            <div className="space-y-1 text-sm">
              <div className="text-text-secondary">
                Location:{" "}
                <span className="font-medium text-text-primary">
                  {
                    locations.find(
                      (l) => l.id === quickBookingFacility.location_id,
                    )?.name
                  }
                </span>
              </div>
              <div className="text-text-secondary">
                Facility type:{" "}
                <span className="font-medium text-text-primary">
                  {formatArenaType(quickBookingFacility.type)}
                </span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Start time"
                type="datetime-local"
                value={quickStart}
                onChange={(e) => setQuickStart(e.target.value)}
              />
              <Input
                label="End time"
                type="datetime-local"
                value={quickEnd}
                onChange={(e) => setQuickEnd(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Duration (minutes)"
                type="number"
                min={15}
                step={15}
                value={quickDurationMinutes}
                onChange={(e) =>
                  setQuickDurationMinutes(
                    Number(e.target.value) || quickDurationMinutes,
                  )
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Guest name (optional)"
                value={quickGuestName}
                onChange={(e) => setQuickGuestName(e.target.value)}
              />
              <Input
                label="Guest phone (optional)"
                value={quickGuestPhone}
                onChange={(e) => setQuickGuestPhone(e.target.value)}
              />
            </div>
            {quickError && (
              <p className="text-sm text-error" role="alert">
                {quickError}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="secondary"
                onClick={() => setQuickBookingFacility(null)}
                disabled={bookingsLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleQuickWalkInSubmit} disabled={bookingsLoading}>
                {bookingsLoading ? "Booking…" : "Confirm quick booking"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

