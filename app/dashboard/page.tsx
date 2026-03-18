"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  Calendar,
  TrendingUp,
  DollarSign,
  Activity,
  MapPin,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import StatCard from "@/components/ui/StatCard";
import LineChart from "@/components/charts/LineChart";
import BarChart from "@/components/charts/BarChart";
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
import { formatCurrency, formatNumber } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  getBookingsApi,
  getClientStatisticsApi,
  getLocationsApi,
  getFacilitiesByLocationApi,
  createBookingApi,
  Booking,
  ClientStatistics,
  Location,
  Facility,
} from "@/lib/api";

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

function diffMinutesRoundedUp(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.ceil(ms / (60 * 1000));
}

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

export default function DashboardPage() {
  const { user } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clientStats, setClientStats] = useState<ClientStatistics | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [facilitiesCount, setFacilitiesCount] = useState<number>(0);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
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
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const clientIdForQueries =
          user?.role === "client"
            ? (user.client_id ?? user.id ?? undefined)
            : undefined;

        const [bookingsRes, statsRes, locationsRes] =
          await Promise.allSettled([
            getBookingsApi(),
            // Only admins can access /clients/statistics
            user?.role === "admin"
              ? getClientStatisticsApi()
              : Promise.resolve(null),
            user?.role === "client"
              ? getLocationsApi(clientIdForQueries)
              : Promise.resolve([] as Location[]),
          ]);

        if (!isMounted) return;

        if (bookingsRes.status === "fulfilled") {
          setBookings(bookingsRes.value || []);
        }
        if (statsRes.status === "fulfilled" && statsRes.value) {
          setClientStats(statsRes.value as ClientStatistics);
        }
        if (locationsRes.status === "fulfilled") {
          const locs = (locationsRes.value || []) as Location[];
          setLocations(locs);
          setSelectedLocationId((prev) => prev || locs[0]?.id || "");

          if (user?.role === "client" && locs.length > 0) {
            const facilityCounts = await Promise.allSettled(
              locs.map((l) => getFacilitiesByLocationApi(l.id)),
            );
            if (!isMounted) return;
            const total = facilityCounts.reduce((sum, res) => {
              if (res.status !== "fulfilled") return sum;
              return sum + (res.value?.length ?? 0);
            }, 0);
            setFacilitiesCount(total);
          } else {
            setFacilitiesCount(0);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
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
  }, [user?.role, selectedLocationId]);

  const modules = useMemo(() => {
    if (!user || !user.modules || user.modules.length === 0) {
      // No explicit module config -> fall back to role-based defaults
      if (!user) return new Set<string>();

      if (user.role === "admin") {
        return new Set<string>([
          "dashboard-overview",
          "analytics",
          "bookings",
        ]);
      }

      // Treat "client" as business owner with a business-focused view
      if (user.role === "client") {
        return new Set<string>([
          "dashboard-overview",
          "bookings",
          "locations",
          "analytics",
          "settings",
        ]);
      }

      // Basic user view
      return new Set<string>(["dashboard-overview"]);
    }

    return new Set<string>(user.modules.filter(Boolean) as string[]);
  }, [user]);

  const showOverview = modules.has("dashboard-overview");
  const showAnalytics = modules.has("analytics");
  const showBookings = modules.has("bookings");
  const showLocations = modules.has("locations");

  const totalBookings = bookings.length;
  const locationsCount = locations.length;

  const bookingsForSelectedLocation = useMemo(() => {
    if (user?.role !== "client") return [];
    if (!selectedLocationId) return [];
    return bookings.filter((b) => b.location_id === selectedLocationId);
  }, [bookings, selectedLocationId, user?.role]);

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

  const recentBookings = [...bookings]
    .sort(
      (a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
    )
    .slice(0, 5);

  const chartData = useMemo(() => {
    // Simple grouping of bookings by month for a basic trend line
    const byMonth: Record<
      string,
      { month: string; bookings: number }
    > = {};

    bookings.forEach((b) => {
      const d = new Date(b.start_time);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0",
      )}`;
      if (!byMonth[key]) {
        byMonth[key] = { month: key, bookings: 0 };
      }
      byMonth[key].bookings += 1;
    });

    return Object.values(byMonth).sort((a, b) =>
      a.month.localeCompare(b.month),
    );
  }, [bookings]);

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
      return { packages: [] as FacilityPackage[], perMinute: null as FacilityPerMinutePricing | null };
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          {user?.role === "client" ? "Business Owner Dashboard" : "Dashboard"}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {user?.role === "client"
            ? "See a focused view of your facilities, bookings, and revenue."
            : "Welcome back! Here's what's happening with your business today."}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      {showOverview && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Bookings"
            value={formatNumber(totalBookings)}
            change={undefined}
            icon={Calendar}
            iconColor="text-warning"
          />
          {user?.role !== "client" && (
            <StatCard
              title="Active Clients"
              value={
                clientStats ? formatNumber(clientStats.active) : loading ? "…" : "0"
              }
              change={undefined}
              icon={Users}
              iconColor="text-primary"
            />
          )}
          {user?.role === "client" && showLocations && (
            <StatCard
              title="Locations"
              value={loading ? "…" : formatNumber(locationsCount)}
              change={undefined}
              icon={MapPin}
              iconColor="text-primary"
            />
          )}
          {showBookings && (
            <StatCard
              title="Pending Bookings"
              value={formatNumber(
                bookings.filter((b) => b.status === "pending").length,
              )}
              change={undefined}
              icon={Activity}
              iconColor="text-success"
            />
          )}
          {user?.role === "client" && (
            <StatCard
              title="Total Facilities"
              value={loading ? "…" : formatNumber(facilitiesCount)}
              change={undefined}
              icon={Activity}
              iconColor="text-error"
            />
          )}
        </div>
      )}

      {/* Facility live status grid (client dashboard) */}
      {user?.role === "client" && (
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
                Loading facilities…
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
                      <h3 className="text-sm font-semibold text-text-primary">
                        {label}
                      </h3>
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
      )}

      {/* Charts Row */}
      {showAnalytics && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue Chart */}
          {showAnalytics && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-text-primary">
                  Bookings Trend
                </h2>
              </CardHeader>
              <CardContent>
                <LineChart
                  data={chartData}
                  dataKey="month"
                  lines={[
                    {
                      key: "bookings",
                      name: "Bookings",
                      color: "rgb(var(--success))",
                    },
                  ]}
                  height={300}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recent Bookings Table */}
      {showBookings && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-text-primary">
              Recent Bookings
            </h2>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.id}</TableCell>
                    <TableCell>{booking.location_id}</TableCell>
                    <TableCell>{booking.facility_id ?? "—"}</TableCell>
                    <TableCell>
                      {new Date(booking.start_time).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(booking.end_time).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          booking.status === "confirmed"
                            ? "bg-success/10 text-success"
                            : booking.status === "pending"
                            ? "bg-warning/10 text-warning"
                            : "bg-error/10 text-error"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
                {quickEstimated.label} —{" "}
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
                {quickSaving ? "Booking…" : "Confirm booking"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
