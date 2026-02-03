"use client";

import React, { useMemo } from "react";
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

// Sample data
const revenueData = [
  { month: "Jan", revenue: 45000, bookings: 320 },
  { month: "Feb", revenue: 52000, bookings: 380 },
  { month: "Mar", revenue: 48000, bookings: 350 },
  { month: "Apr", revenue: 61000, bookings: 420 },
  { month: "May", revenue: 55000, bookings: 390 },
  { month: "Jun", revenue: 67000, bookings: 450 },
];

const gamingData = [
  { name: "Gaming Zone A", bookings: 120, revenue: 15000 },
  { name: "Gaming Zone B", bookings: 95, revenue: 12000 },
  { name: "Gaming Zone C", bookings: 80, revenue: 10000 },
  { name: "Gaming Zone D", bookings: 65, revenue: 8000 },
];

const recentBookings = [
  {
    id: "#BK-001",
    customer: "John Doe",
    facility: "Gaming Zone A",
    date: "2026-01-27",
    time: "14:00",
    amount: 150,
    status: "confirmed",
  },
  {
    id: "#BK-002",
    customer: "Jane Smith",
    facility: "Gaming Zone B",
    date: "2026-01-27",
    time: "16:00",
    amount: 200,
    status: "pending",
  },
  {
    id: "#BK-003",
    customer: "Mike Johnson",
    facility: "Gaming Zone C",
    date: "2026-01-28",
    time: "10:00",
    amount: 120,
    status: "confirmed",
  },
  {
    id: "#BK-004",
    customer: "Sarah Williams",
    facility: "Gaming Zone A",
    date: "2026-01-28",
    time: "18:00",
    amount: 180,
    status: "confirmed",
  },
  {
    id: "#BK-005",
    customer: "David Brown",
    facility: "Gaming Zone D",
    date: "2026-01-29",
    time: "12:00",
    amount: 100,
    status: "pending",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();

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
          "gaming",
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

      {/* Stats Grid */}
      {showOverview && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(328000)}
            change={{ value: 12.5, isPositive: true }}
            icon={DollarSign}
            iconColor="text-success"
          />
          {user?.role !== "client" && (
            <StatCard
              title="Active Users"
              value={formatNumber(1248)}
              change={{ value: 8.2, isPositive: true }}
              icon={Users}
              iconColor="text-primary"
            />
          )}
          {showBookings && (
            <StatCard
              title="Total Bookings"
              value={formatNumber(2310)}
              change={{ value: 5.3, isPositive: true }}
              icon={Calendar}
              iconColor="text-warning"
            />
          )}
          {showGaming && (
            <StatCard
              title="Gaming Facilities"
              value={formatNumber(12)}
              change={{ value: 0, isPositive: true }}
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
                  Revenue &amp; Bookings
                </h2>
              </CardHeader>
              <CardContent>
                <LineChart
                  data={revenueData}
                  dataKey="month"
                  lines={[
                    {
                      key: "revenue",
                      name: "Revenue",
                      color: "rgb(var(--primary))",
                    },
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
                  data={gamingData}
                  dataKey="name"
                  bars={[
                    {
                      key: "bookings",
                      name: "Bookings",
                      color: "rgb(var(--primary))",
                    },
                    {
                      key: "revenue",
                      name: "Revenue",
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
                  <TableHead>Customer</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead>Date &amp; Time</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.id}</TableCell>
                    <TableCell>{booking.customer}</TableCell>
                    <TableCell>{booking.facility}</TableCell>
                    <TableCell>
                      {booking.date} at {booking.time}
                    </TableCell>
                    <TableCell>{formatCurrency(booking.amount)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          booking.status === "confirmed"
                            ? "bg-success/10 text-success"
                            : "bg-warning/10 text-warning"
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
