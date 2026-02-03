"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import LineChart from "@/components/charts/LineChart";
import BarChart from "@/components/charts/BarChart";
import PieChart from "@/components/charts/PieChart";

const revenueData = [
  { month: "Jan", revenue: 45000, expenses: 30000 },
  { month: "Feb", revenue: 52000, expenses: 32000 },
  { month: "Mar", revenue: 48000, expenses: 31000 },
  { month: "Apr", revenue: 61000, expenses: 35000 },
  { month: "May", revenue: 55000, expenses: 33000 },
  { month: "Jun", revenue: 67000, expenses: 38000 },
];

const facilityPerformance = [
  { name: "Gaming Zone A", bookings: 120 },
  { name: "Gaming Zone B", bookings: 95 },
  { name: "Gaming Zone C", bookings: 80 },
  { name: "Gaming Zone D", bookings: 65 },
];

const bookingDistribution = [
  { name: "Gaming Zone A", value: 35 },
  { name: "Gaming Zone B", value: 28 },
  { name: "Gaming Zone C", value: 23 },
  { name: "Gaming Zone D", value: 14 },
];

const chartColors = [
  "rgb(var(--primary))",
  "rgb(var(--success))",
  "rgb(var(--warning))",
  "rgb(var(--error))",
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Analytics</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Detailed insights and performance metrics
        </p>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-text-primary">
            Revenue & Expenses
          </h2>
        </CardHeader>
        <CardContent>
          <LineChart
            data={revenueData}
            dataKey="month"
            lines={[
              { key: "revenue", name: "Revenue", color: chartColors[1] },
              { key: "expenses", name: "Expenses", color: chartColors[2] },
            ]}
            height={400}
          />
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-text-primary">
              Booking Distribution
            </h2>
          </CardHeader>
          <CardContent>
            <PieChart
              data={bookingDistribution}
              colors={chartColors}
              height={300}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
