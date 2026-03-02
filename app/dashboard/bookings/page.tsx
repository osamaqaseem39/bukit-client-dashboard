"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Link from "next/link";
import {
  getBookingsApi,
  getLocationsApi,
  getFacilitiesByLocationApi,
} from "@/lib/api";
import type { Booking, Location, Facility } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [facilityNames, setFacilityNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [bookingsRes, locationsRes] = await Promise.all([
          getBookingsApi(),
          getLocationsApi(undefined),
        ]);
        if (!isMounted) return;
        setBookings(bookingsRes);
        setLocations(locationsRes);

        const locationIds = [...new Set(bookingsRes.map((b) => b.location_id))];
        const names: Record<string, string> = {};
        await Promise.all(
          locationIds.map(async (locId) => {
            try {
              const facilities = await getFacilitiesByLocationApi(locId);
              facilities.forEach((f: Facility) => {
                names[f.id] = f.name;
              });
            } catch {
              // ignore per-location errors
            }
          })
        );
        if (isMounted) setFacilityNames(names);
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load bookings");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const locationById = useMemo(() => {
    const map = new Map<string, Location>();
    locations.forEach((l) => map.set(l.id, l));
    return map;
  }, [locations]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const now = new Date();
    const thisMonth = bookings.filter((b) => {
      const d = new Date(b.start_time);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const pending = bookings.filter((b) => b.status === "pending").length;
    const confirmed = bookings.filter((b) => b.status === "confirmed").length;
    return { total, thisMonth, pending, confirmed };
  }, [bookings]);

  const sortedBookings = useMemo(
    () =>
      [...bookings].sort(
        (a, b) =>
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      ),
    [bookings]
  );

  function formatDateTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  function locationName(locationId: string) {
    const loc = locationById.get(locationId);
    return loc ? loc.name : locationId;
  }

  function facilityName(facilityId: string | null | undefined) {
    if (!facilityId) return "—";
    return facilityNames[facilityId] ?? facilityId;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Bookings</h1>
          <p className="mt-1 text-sm text-text-secondary">
            View bookings for your locations and facilities. Bookings are created in the app from the facilities you add.
          </p>
        </div>
        <Link href="/dashboard/bookings/new">
          <Button variant="primary">New walk-in booking</Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Total bookings</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {loading ? "…" : stats.total}
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
                <p className="text-sm font-medium text-text-secondary">This month</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {loading ? "…" : stats.thisMonth}
                </p>
              </div>
              <Clock className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Pending</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {loading ? "…" : stats.pending}
                </p>
              </div>
              <MapPin className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-text-primary">Bookings</h2>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
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
                sortedBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {booking.id.slice(0, 8)}…
                    </TableCell>
                    <TableCell>{locationName(booking.location_id)}</TableCell>
                    <TableCell>{facilityName(booking.facility_id)}</TableCell>
                    <TableCell>
                      {booking.is_walk_in ? (
                        <span className="inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          Walk-in
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-500">
                          Online
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{formatDateTime(booking.start_time)}</TableCell>
                    <TableCell>{formatDateTime(booking.end_time)}</TableCell>
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
              {!loading && sortedBookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-text-secondary">
                    No bookings yet. Add locations and facilities, then they can be booked in the app.
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
