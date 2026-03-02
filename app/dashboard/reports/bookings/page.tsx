"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import {
  getBookingsReportApi,
  getLocationsApi,
  getFacilitiesByLocationApi,
  type BookingsReportRow,
  type Location,
  type Facility,
} from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function BookingsReportPage() {
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [locationId, setLocationId] = useState<string>("");
  const [facilityId, setFacilityId] = useState<string>("");
  const [rows, setRows] = useState<BookingsReportRow[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadFilters() {
      try {
        const locs = await getLocationsApi(undefined);
        if (!mounted) return;
        setLocations(locs);
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message || "Failed to load locations");
      }
    }
    loadFilters();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadFacilities() {
      if (!locationId) {
        setFacilities([]);
        return;
      }
      try {
        const list = await getFacilitiesByLocationApi(locationId);
        if (!mounted) return;
        setFacilities(list);
      } catch {
        if (mounted) setFacilities([]);
      }
    }
    loadFacilities();
    return () => {
      mounted = false;
    };
  }, [locationId]);

  useEffect(() => {
    let mounted = true;
    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const data = await getBookingsReportApi({
          from,
          to,
          location_id: locationId || undefined,
          facility_id: facilityId || undefined,
        });
        if (!mounted) return;
        setRows(data);
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message || "Failed to load bookings report");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadReport();
    return () => {
      mounted = false;
    };
  }, [from, to, locationId, facilityId]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.total += row.total_bookings;
        acc.confirmed += row.confirmed;
        acc.pending += row.pending;
        acc.cancelled += row.cancelled;
        acc.walkIns += row.walk_ins;
        acc.revenue += row.revenue || 0;
        return acc;
      },
      {
        total: 0,
        confirmed: 0,
        pending: 0,
        cancelled: 0,
        walkIns: 0,
        revenue: 0,
      }
    );
  }, [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          Bookings report
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Summary of bookings and revenue over a date range.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-medium text-text-primary">
                Filters
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Choose a date range and optional location/facility.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="w-full md:w-40">
                <Input
                  type="date"
                  label="From"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="w-full md:w-40">
                <Input
                  type="date"
                  label="To"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
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
          <div className="mb-4 grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase text-text-secondary">
                Total bookings
              </p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">
                {loading ? "…" : totals.total}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-text-secondary">
                Confirmed
              </p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">
                {loading ? "…" : totals.confirmed}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-text-secondary">
                Cancellations
              </p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">
                {loading ? "…" : totals.cancelled}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-text-secondary">
                Revenue
              </p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">
                {loading ? "…" : totals.revenue.toFixed(2)}
              </p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Confirmed</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Cancelled</TableHead>
                <TableHead>Walk-ins</TableHead>
                <TableHead>Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-sm text-text-secondary"
                  >
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                rows.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.total_bookings}</TableCell>
                    <TableCell>{row.confirmed}</TableCell>
                    <TableCell>{row.pending}</TableCell>
                    <TableCell>{row.cancelled}</TableCell>
                    <TableCell>{row.walk_ins}</TableCell>
                    <TableCell>
                      {row.revenue !== null ? row.revenue.toFixed(2) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-sm text-text-secondary"
                  >
                    No data for this period.
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

