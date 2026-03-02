"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  getDailyLedgerApi,
  getLocationsApi,
  getFacilitiesByLocationApi,
} from "@/lib/api";
import type { Booking, Location, Facility } from "@/lib/api";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function LedgerPage() {
  const [date, setDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [locationId, setLocationId] = useState<string>("");
  const [facilityId, setFacilityId] = useState<string>("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
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
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadFacilities() {
      if (!locationId) {
        setFacilities([]);
        return;
      }
      try {
        const list = await getFacilitiesByLocationApi(locationId);
        if (!isMounted) return;
        setFacilities(list);
      } catch {
        if (isMounted) setFacilities([]);
      }
    }
    loadFacilities();
    return () => {
      isMounted = false;
    };
  }, [locationId]);

  useEffect(() => {
    let isMounted = true;
    async function loadLedger() {
      setLoading(true);
      setError(null);
      try {
        const data = await getDailyLedgerApi({
          date,
          location_id: locationId || undefined,
          facility_id: facilityId || undefined,
        });
        if (!isMounted) return;
        setBookings(data);
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load ledger");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadLedger();
    return () => {
      isMounted = false;
    };
  }, [date, locationId, facilityId]);

  const locationById = useMemo(() => {
    const map = new Map<string, Location>();
    locations.forEach((l) => map.set(l.id, l));
    return map;
  }, [locations]);

  function locationName(id: string) {
    const loc = locationById.get(id);
    return loc ? loc.name : id;
  }

  function facilityName(id: string | null | undefined) {
    if (!id) return "—";
    const f = facilities.find((x) => x.id === id);
    return f ? f.name : id;
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const totals = useMemo(() => {
    const count = bookings.length;
    const checkedIn = bookings.filter((b: any) => (b as any).checked_in_at).length;
    const walkIns = bookings.filter((b: any) => (b as any).is_walk_in).length;
    return { count, checkedIn, walkIns };
  }, [bookings]);

  async function handleCheckIn(id: string) {
    setCheckingInId(id);
    setError(null);
    try {
      const res = await import("@/lib/api").then((m) => m.checkInBookingApi(id));
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...res } : b))
      );
    } catch (err: any) {
      setError(err.message || "Failed to check in booking");
    } finally {
      setCheckingInId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Daily ledger</h1>
          <p className="mt-1 text-sm text-text-secondary">
            View today&apos;s bookings and walk-ins, and mark guests as checked in.
          </p>
        </div>
        <Link href="/dashboard/ledger/booking">
          <Button variant="primary">New walk-in booking</Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">
                  Total bookings
                </p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {loading ? "…" : totals.count}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">
                  Checked in
                </p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {loading ? "…" : totals.checkedIn}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">
                  Walk-ins
                </p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {loading ? "…" : totals.walkIns}
                </p>
              </div>
              <MapPin className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-medium text-text-primary">Ledger</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Filter by date, location, and facility.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="w-full md:w-40">
                <Input
                  type="date"
                  label="Date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="w-full md:w-48">
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Location
                </label>
                <select
                  className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3 text-[15px] text-gray-800 focus:border-fuchsia-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-100"
                  value={locationId}
                  onChange={(e) => {
                    setLocationId(e.target.value);
                    setFacilityId("");
                  }}
                >
                  <option value="">All locations</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full md:w-48">
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Facility
                </label>
                <select
                  className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3 text-[15px] text-gray-800 focus:border-fuchsia-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-100"
                  value={facilityId}
                  onChange={(e) => setFacilityId(e.target.value)}
                  disabled={!locationId}
                >
                  <option value="">All facilities</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-in</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-text-secondary">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                bookings.map((booking: any) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      {formatTime(booking.start_time)} –{" "}
                      {formatTime(booking.end_time)}
                    </TableCell>
                    <TableCell>{locationName(booking.location_id)}</TableCell>
                    <TableCell>{facilityName(booking.facility_id)}</TableCell>
                    <TableCell>
                      {(booking as any).is_walk_in ? (
                        <span className="inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          Walk-in
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-500">
                          Online
                        </span>
                      )}
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
                    <TableCell>
                      {(booking as any).checked_in_at ? (
                        <span className="text-xs text-success">Checked in</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={checkingInId === booking.id}
                          onClick={() => handleCheckIn(booking.id)}
                        >
                          {checkingInId === booking.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Check in"
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              {!loading && bookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-text-secondary">
                    No bookings for this day yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

