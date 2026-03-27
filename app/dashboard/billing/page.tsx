"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";
import {
  Booking,
  Facility,
  Location,
  createBookingApi,
  getBookingsApi,
  getFacilitiesByLocationApi,
  getLocationsApi,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

type FacilityPackage = {
  id: string;
  title: string;
  minutes: number;
  price: number;
  currency: string;
  validity_hours?: number;
};

type FacilityPerMinutePricing = {
  rate_per_minute: number;
  currency: string;
  billing_interval_minutes: number;
  minimum_minutes?: number;
};

function formatFacilityType(type: string) {
  const map: Record<string, string> = {
    "gaming-pc": "PC",
    "table-tennis-table": "Table tennis",
    "snooker-table": "Snooker",
    "futsal-field": "Futsal",
    "cricket-pitch": "Cricket",
    "padel-court": "Padel",
    ps4: "PS4",
    ps5: "PS5",
    xbox: "Xbox",
  };
  return map[type] || type.replaceAll("-", " ");
}

function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(
    2,
    "0",
  )}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function roundUpToNextFiveMinutes(d: Date): Date {
  const rounded = new Date(d);
  rounded.setSeconds(0, 0);
  const mins = rounded.getMinutes();
  const next = Math.ceil(mins / 5) * 5;
  if (next >= 60) {
    rounded.setHours(rounded.getHours() + 1);
    rounded.setMinutes(0);
    return rounded;
  }
  rounded.setMinutes(next);
  return rounded;
}

function diffMinutesRoundedUp(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.ceil(ms / (60 * 1000));
}

function getFacilityPricing(facility: Facility | null): {
  packages: FacilityPackage[];
  perMinute: FacilityPerMinutePricing | null;
} {
  const pricing = (facility?.metadata as any)?.pricing;
  const packagesRaw = Array.isArray(pricing?.packages) ? pricing.packages : [];
  const packages: FacilityPackage[] = packagesRaw
    .map((p: any) => ({
      id: String(p?.id ?? ""),
      title: String(p?.title ?? ""),
      minutes: Number(p?.minutes ?? 0),
      price: Number(p?.price ?? 0),
      currency: String(p?.currency ?? ""),
      validity_hours:
        p?.validity_hours != null ? Number(p.validity_hours) : undefined,
    }))
    .filter(
      (p: FacilityPackage) =>
        Boolean(p.id) &&
        Boolean(p.title) &&
        Number.isFinite(p.minutes) &&
        p.minutes > 0 &&
        Number.isFinite(p.price) &&
        p.price >= 0 &&
        Boolean(p.currency),
    );

  const perRaw = pricing?.per_minute;
  const perMinute: FacilityPerMinutePricing | null =
    perRaw &&
    Number.isFinite(Number(perRaw.rate_per_minute)) &&
    Number.isFinite(Number(perRaw.billing_interval_minutes)) &&
    Number(perRaw.billing_interval_minutes) > 0 &&
    String(perRaw.currency || "")
      ? {
          rate_per_minute: Number(perRaw.rate_per_minute),
          currency: String(perRaw.currency),
          billing_interval_minutes: Number(perRaw.billing_interval_minutes),
          minimum_minutes:
            perRaw.minimum_minutes != null
              ? Number(perRaw.minimum_minutes)
              : undefined,
        }
      : null;

  return { packages, perMinute };
}

export default function BillingPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [quickBookingFacility, setQuickBookingFacility] =
    useState<Facility | null>(null);
  const [quickStart, setQuickStart] = useState<string>("");
  const [quickEnd, setQuickEnd] = useState<string>("");
  const [quickGuestName, setQuickGuestName] = useState<string>("");
  const [quickGuestPhone, setQuickGuestPhone] = useState<string>("");
  const [quickSelectedPackageId, setQuickSelectedPackageId] =
    useState<string>("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "client") return;
    let mounted = true;
    setLoading(true);
    setError(null);
    const clientIdForQueries = user.clientAdminUserId ?? user.id ?? undefined;

    Promise.all([getBookingsApi(), getLocationsApi(clientIdForQueries)])
      .then(([bookingsRes, locationsRes]) => {
        if (!mounted) return;
        setBookings(bookingsRes || []);
        const locs = locationsRes || [];
        setLocations(locs);
        setSelectedLocationId((prev) => prev || locs[0]?.id || "");
      })
      .catch((err: any) => {
        if (!mounted) return;
        setError(err?.message || "Failed to load billing data");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (user?.role !== "client") return;
    if (!selectedLocationId) {
      setFacilities([]);
      return;
    }
    let mounted = true;
    setFacilitiesLoading(true);
    setError(null);
    getFacilitiesByLocationApi(selectedLocationId)
      .then((data) => {
        if (!mounted) return;
        setFacilities(data || []);
      })
      .catch((err: any) => {
        if (!mounted) return;
        setError(err?.message || "Failed to load facilities");
      })
      .finally(() => {
        if (mounted) setFacilitiesLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [selectedLocationId, user?.role]);

  const bookingsForSelectedLocation = useMemo(() => {
    if (!selectedLocationId) return [];
    return bookings.filter((b) => b.location_id === selectedLocationId);
  }, [bookings, selectedLocationId]);

  function findCurrentBookingForFacility(facilityId: string) {
    const now = new Date();
    return bookingsForSelectedLocation.find((b) => {
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

  const facilityGroups = useMemo(() => {
    const groups: Record<string, Facility[]> = {};
    facilities.forEach((f) => {
      const key = formatFacilityType(f.type);
      groups[key] = groups[key] || [];
      groups[key].push(f);
    });
    Object.values(groups).forEach((arr) =>
      arr.sort((a, b) => a.name.localeCompare(b.name)),
    );
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [facilities]);

  async function handleQuickBookSubmit() {
    if (!quickBookingFacility) return;

    const startDate = quickStart ? new Date(quickStart) : new Date();
    const endDate = quickEnd
      ? new Date(quickEnd)
      : new Date(startDate.getTime() + 60 * 60 * 1000);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setQuickError("Please provide valid start and end times.");
      return;
    }
    if (endDate.getTime() <= startDate.getTime()) {
      setQuickError("End time must be after start time.");
      return;
    }

    const overlapping = bookingsForSelectedLocation.some((b) => {
      if (b.facility_id !== quickBookingFacility.id) return false;
      if (b.status === "cancelled") return false;
      const existingStart = new Date(b.start_time);
      const existingEnd = new Date(b.end_time);
      if (isNaN(existingStart.getTime()) || isNaN(existingEnd.getTime()))
        return false;
      return (
        startDate.getTime() < existingEnd.getTime() &&
        endDate.getTime() > existingStart.getTime()
      );
    });
    if (overlapping) {
      setQuickError("This facility already has a booking in that time slot.");
      return;
    }

    try {
      setQuickSaving(true);
      setQuickError(null);

      const { packages, perMinute } = getFacilityPricing(quickBookingFacility);
      const selectedPackage =
        quickSelectedPackageId && packages.length
          ? packages.find((p) => p.id === quickSelectedPackageId) || null
          : null;

      let amount: number | undefined;
      let currency: string | undefined;
      if (selectedPackage) {
        amount = selectedPackage.price;
        currency = selectedPackage.currency;
      } else if (perMinute) {
        const minutes = diffMinutesRoundedUp(startDate, endDate);
        const interval = perMinute.billing_interval_minutes;
        const roundedMinutes = Math.ceil(minutes / interval) * interval;
        const minMinutes =
          perMinute.minimum_minutes != null && perMinute.minimum_minutes > 0
            ? perMinute.minimum_minutes
            : 0;
        const billable = Math.max(roundedMinutes, minMinutes);
        amount = billable * perMinute.rate_per_minute;
        currency = perMinute.currency;
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
        amount,
        currency,
      });
      setBookings((prev) => [newBooking, ...prev]);
      setQuickBookingFacility(null);
      setQuickGuestName("");
      setQuickGuestPhone("");
      setQuickStart("");
      setQuickEnd("");
      setQuickSelectedPackageId("");
    } catch (err: any) {
      setQuickError(err?.message || "Failed to create booking");
    } finally {
      setQuickSaving(false);
    }
  }

  const quickPricing = useMemo(() => {
    if (!quickBookingFacility) {
      return {
        packages: [] as FacilityPackage[],
        perMinute: null as FacilityPerMinutePricing | null,
      };
    }
    return getFacilityPricing(quickBookingFacility);
  }, [quickBookingFacility]);

  const quickSelectedPackage = useMemo(() => {
    if (!quickSelectedPackageId) return null;
    return quickPricing.packages.find((p) => p.id === quickSelectedPackageId) || null;
  }, [quickPricing.packages, quickSelectedPackageId]);

  const quickEstimated = useMemo(() => {
    if (!quickBookingFacility) return null;
    const startDate = quickStart ? new Date(quickStart) : null;
    const endDate = quickEnd ? new Date(quickEnd) : null;
    if (!startDate || !endDate) return null;
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
    if (endDate.getTime() <= startDate.getTime()) return null;
    if (quickSelectedPackage) {
      return {
        label: `Package: ${quickSelectedPackage.title}`,
        amount: quickSelectedPackage.price,
        currency: quickSelectedPackage.currency,
      };
    }
    const perMinute = quickPricing.perMinute;
    if (!perMinute) return null;
    const minutes = diffMinutesRoundedUp(startDate, endDate);
    const interval = perMinute.billing_interval_minutes;
    const roundedMinutes = Math.ceil(minutes / interval) * interval;
    const minMinutes =
      perMinute.minimum_minutes != null && perMinute.minimum_minutes > 0
        ? perMinute.minimum_minutes
        : 0;
    const billable = Math.max(roundedMinutes, minMinutes);
    return {
      label: `Per-minute (${perMinute.rate_per_minute}/${perMinute.currency} per min)`,
      amount: billable * perMinute.rate_per_minute,
      currency: perMinute.currency,
    };
  }, [
    quickBookingFacility,
    quickEnd,
    quickPricing.perMinute,
    quickSelectedPackage,
    quickStart,
  ]);

  if (user?.role !== "client") {
    return (
      <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
        Billing/invoice view is available for client accounts.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Billing / Invoice</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Review live facility occupancy and create quick invoiced bookings.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-medium text-text-primary">
                Facilities live status
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                See which facilities are booked right now and quick-book with one click.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-text-secondary" />
              <select
                className="min-w-[220px] rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                disabled={loading || locations.length === 0}
              >
                {loading && <option value="">Loading locations…</option>}
                {!loading && locations.length === 0 && (
                  <option value="">No locations found</option>
                )}
                {!loading &&
                  locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {facilitiesLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-text-secondary">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading facilities...
            </div>
          ) : !selectedLocationId ? (
            <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-text-secondary">
              Select a location to view facilities.
            </div>
          ) : facilities.length === 0 ? (
            <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-text-secondary">
              No facilities found for this location.
            </div>
          ) : (
            <div className="space-y-6">
              {facilityGroups.map(([label, items]) => (
                <div key={label} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
                    <span className="text-xs text-text-secondary">
                      {items.length} {items.length === 1 ? "facility" : "facilities"}
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {items.map((f) => {
                      const current = findCurrentBookingForFacility(f.id);
                      const isBooked = Boolean(current);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setQuickBookingFacility(f);
                            setQuickError(null);
                            const start = roundUpToNextFiveMinutes(new Date());
                            const inOneHour = new Date(start.getTime() + 60 * 60 * 1000);
                            setQuickStart(toLocalInput(start));
                            setQuickEnd(toLocalInput(inOneHour));
                            const pricing = getFacilityPricing(f);
                            setQuickSelectedPackageId(pricing.packages[0]?.id || "");
                          }}
                          className={`group relative flex flex-col gap-2 rounded-xl border px-4 py-3 text-left transition ${
                            isBooked
                              ? "border-warning/40 bg-warning/5 hover:bg-warning/10"
                              : "border-success/40 bg-success/5 hover:bg-success/10"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-text-primary">
                                {f.name}
                              </div>
                              <div className="mt-0.5 text-xs text-text-secondary">
                                {formatFacilityType(f.type)}
                              </div>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${
                                isBooked
                                  ? "bg-warning/15 text-warning"
                                  : "bg-success/15 text-success"
                              }`}
                            >
                              {isBooked ? "Booked" : "Free"}
                            </span>
                          </div>

                          <div className="text-xs text-text-secondary">
                            {isBooked && current ? (
                              <span className="font-medium text-text-primary">
                                {new Date(current.start_time).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                -{" "}
                                {new Date(current.end_time).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            ) : (
                              <span>Available now</span>
                            )}
                          </div>

                          <div className="pt-1">
                            <span className="inline-flex rounded-md bg-background/70 px-2 py-1 text-[11px] text-text-secondary shadow-sm ring-1 ring-border transition group-hover:bg-background">
                              Click to quick book
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {quickBookingFacility && (
        <Modal
          isOpen={!!quickBookingFacility}
          onClose={() => {
            if (quickSaving) return;
            setQuickBookingFacility(null);
            setQuickError(null);
          }}
          title={`Quick book - ${quickBookingFacility.name}`}
          size="md"
        >
          <div className="space-y-4">
            {(quickPricing.packages.length > 0 || quickPricing.perMinute) && (
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                {quickPricing.packages.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                      Packages
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {quickPricing.packages.map((p) => {
                        const active = p.id === quickSelectedPackageId;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setQuickSelectedPackageId(p.id);
                              const startDate = quickStart
                                ? new Date(quickStart)
                                : roundUpToNextFiveMinutes(new Date());
                              if (isNaN(startDate.getTime())) return;
                              const end = new Date(startDate.getTime() + p.minutes * 60 * 1000);
                              setQuickStart(toLocalInput(startDate));
                              setQuickEnd(toLocalInput(end));
                            }}
                            className={`rounded-full border px-3 py-1 text-xs transition ${
                              active
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background text-text-secondary hover:bg-muted/40"
                            }`}
                          >
                            {p.title} · {p.minutes}m · {p.price} {p.currency}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setQuickSelectedPackageId("")}
                        className={`rounded-full border px-3 py-1 text-xs transition ${
                          !quickSelectedPackageId
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-text-secondary hover:bg-muted/40"
                        }`}
                      >
                        No package
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-text-secondary">
                    Per-minute pricing will be used.
                  </div>
                )}
              </div>
            )}
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
            {quickEstimated && (
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-text-secondary">
                <span className="font-medium text-text-primary">Estimated:</span>{" "}
                {quickEstimated.label} -{" "}
                <span className="font-semibold text-text-primary">
                  {`${formatCurrency(quickEstimated.amount)} ${quickEstimated.currency}`}
                </span>
              </div>
            )}
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
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => setQuickBookingFacility(null)}
                disabled={quickSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleQuickBookSubmit} disabled={quickSaving}>
                {quickSaving ? "Booking..." : "Confirm booking"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

