"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import LineChart from "@/components/charts/LineChart";
import BarChart from "@/components/charts/BarChart";
import PieChart from "@/components/charts/PieChart";

import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  getBookingsApi,
  getFacilitiesByLocationApi,
} from "@/lib/api";
import type { Booking, Facility } from "@/lib/api";

const chartColors = [
  "rgb(var(--primary))",
  "rgb(var(--success))",
  "rgb(var(--warning))",
  "rgb(var(--error))",
];

export default function AnalyticsPage() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [facilityNamesById, setFacilityNamesById] = useState<Record<string, string>>({});

  const allowedFacilityTypes = useMemo(() => {
    if (pathname.includes("/dashboard/arena")) {
      return ["futsal-field", "cricket-pitch", "padel-court"];
    }
    if (pathname.includes("/dashboard/gaming-zone")) {
      return ["gaming-pc", "ps4", "ps5", "xbox"];
    }
    return null;
  }, [pathname]);

  const scopeTitle = useMemo(() => {
    if (pathname.includes("/dashboard/arena")) return "Arena analytics";
    if (pathname.includes("/dashboard/gaming-zone")) return "Gaming zone analytics";
    return "Analytics";
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const bookingsRes = await getBookingsApi();
        const locationIds = [...new Set(bookingsRes.map((b) => b.location_id))];

        const names: Record<string, string> = {};
        const typesByFacilityId: Record<string, string> = {};

        await Promise.all(
          locationIds.map(async (locId) => {
            const facilities: Facility[] = await getFacilitiesByLocationApi(locId);
            facilities.forEach((f) => {
              names[f.id] = f.name;
              typesByFacilityId[f.id] = f.type;
            });
          })
        );

        const filtered = allowedFacilityTypes
          ? bookingsRes.filter((b) => {
              if (!b.facility_id) return false;
              const t = typesByFacilityId[b.facility_id];
              return Boolean(t && allowedFacilityTypes.includes(t));
            })
          : bookingsRes;

        if (!isMounted) return;
        setBookings(filtered);
        setFacilityNamesById(names);
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load analytics data");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [allowedFacilityTypes?.join(",")]);

  const revenueData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const label = d.toLocaleString(undefined, { month: "short" });
      const year = d.getFullYear();
      const month = d.getMonth();
      return { label, year, month };
    });

    return months.map((m) => {
      const revenue = bookings.reduce((acc, b) => {
        const d = new Date(b.start_time);
        if (d.getFullYear() === m.year && d.getMonth() === m.month) {
          return acc + Number(b.amount ?? 0);
        }
        return acc;
      }, 0);

      return { month: m.label, revenue, expenses: 0 };
    });
  }, [bookings]);

  const facilityPerformance = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of bookings) {
      if (!b.facility_id) continue;
      counts.set(b.facility_id, (counts.get(b.facility_id) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([facilityId, count]) => ({
        name: facilityNamesById[facilityId] ?? facilityId,
        bookings: count,
      }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);
  }, [bookings, facilityNamesById]);

  const bookingDistribution = useMemo(() => {
    const dist: Record<string, number> = {
      confirmed: 0,
      pending: 0,
      cancelled: 0,
    };
    for (const b of bookings) {
      if (dist[b.status] != null) dist[b.status] += 1;
    }
    return [
      { name: "Confirmed", value: dist.confirmed },
      { name: "Pending", value: dist.pending },
      { name: "Cancelled", value: dist.cancelled },
    ];
  }, [bookings]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">{scopeTitle}</h1>
        <p className="mt-1 text-sm text-text-secondary">Detailed insights and performance metrics</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-text-primary">
            Revenue & Expenses
          </h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-80 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
            </div>
          ) : (
            <LineChart
              data={revenueData}
              dataKey="month"
              lines={[
                { key: "revenue", name: "Revenue", color: chartColors[1] },
                { key: "expenses", name: "Expenses", color: chartColors[2] },
              ]}
              height={400}
            />
          )}
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-text-primary">
              Facility Performance
            </h2>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-72 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
              </div>
            ) : (
              <BarChart
                data={facilityPerformance}
                dataKey="name"
                bars={[
                  {
                    key: "bookings",
                    name: "Bookings",
                    color: chartColors[0],
                  },
                ]}
                height={300}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-text-primary">
              Booking Distribution
            </h2>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-72 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
              </div>
            ) : (
              <PieChart data={bookingDistribution} colors={chartColors} height={300} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
