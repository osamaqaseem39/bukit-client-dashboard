"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  Gamepad2,
  Calendar,
  TrendingUp,
  DollarSign,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import StatCard from "@/components/ui/StatCard";
import LineChart from "@/components/charts/LineChart";
import BarChart from "@/components/charts/BarChart";
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
  getGamingCentersApi,
  Booking,
  GamingCenter,
  ClientStatistics,
} from "@/lib/api";

export default function DashboardPage() {
  const { user } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [gamingCenters, setGamingCenters] = useState<GamingCenter[]>([]);
  const [clientStats, setClientStats] = useState<ClientStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [bookingsRes, gamingRes, statsRes] = await Promise.allSettled([
          getBookingsApi(),
          getGamingCentersApi(user?.role === "client" ? user.id : undefined),
          // Only admins can access /clients/statistics
          user?.role === "admin" ? getClientStatisticsApi() : Promise.resolve(null),
        ]);

        if (!isMounted) return;

        if (bookingsRes.status === "fulfilled") {
          setBookings(bookingsRes.value || []);
        }
        if (gamingRes.status === "fulfilled") {
          setGamingCenters(gamingRes.value || []);
        }
        if (statsRes.status === "fulfilled" && statsRes.value) {
          setClientStats(statsRes.value as ClientStatistics);
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

  const modules = useMemo(() => {
    if (!user || !user.modules || user.modules.length === 0) {
      // No explicit module config -> fall back to role-based defaults
      if (!user) return new Set<string>();

      if (user.role === "admin") {
        return new Set<string>([
          "dashboard-overview",
          "analytics",
          "bookings",
          "gaming",
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
  const showGaming = modules.has("gaming");
  const showLocations = modules.has("locations");

  const totalBookings = bookings.length;
  const gamingCount = gamingCenters.length;

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
          {showGaming && (
            <StatCard
              title="Gaming Facilities"
              value={formatNumber(gamingCount)}
              change={undefined}
              icon={Gamepad2}
              iconColor="text-error"
            />
          )}
        </div>
      )}

      {/* Charts Row */}
      {(showAnalytics || showGaming) && (
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

          {/* Gaming Facilities Chart */}
          {showGaming && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-text-primary">
                  Gaming Facilities Performance
                </h2>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={gamingCenters}
                  dataKey="name"
                  bars={[
                    {
                      key: "status",
                      name: "Status (active=1, other=0)",
                      color: "rgb(var(--primary))",
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
    </div>
  );
}
