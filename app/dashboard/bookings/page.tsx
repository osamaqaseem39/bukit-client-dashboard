"use client";

import React from "react";
import { Calendar, Clock, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { formatCurrency } from "@/lib/utils";

const bookings = [
  {
    id: "#BK-001",
    customer: "John Doe",
    facility: "Gaming Zone A",
    date: "2026-01-27",
    time: "14:00 - 16:00",
    duration: 2,
    amount: 300,
    status: "confirmed",
  },
  {
    id: "#BK-002",
    customer: "Jane Smith",
    facility: "Gaming Zone B",
    date: "2026-01-27",
    time: "16:00 - 18:00",
    duration: 2,
    amount: 400,
    status: "pending",
  },
  {
    id: "#BK-003",
    customer: "Mike Johnson",
    facility: "Gaming Zone C",
    date: "2026-01-28",
    time: "10:00 - 12:00",
    duration: 2,
    amount: 240,
    status: "confirmed",
  },
];

export default function BookingsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Bookings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          View and manage all bookings
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">
                  Total Bookings
                </p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  2,310
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
                  This Month
                </p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  450
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
                <p className="text-sm font-medium text-text-secondary">
                  Total Revenue
                </p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {formatCurrency(328000)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings Table */}
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
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">{booking.id}</TableCell>
                  <TableCell>{booking.customer}</TableCell>
                  <TableCell>{booking.facility}</TableCell>
                  <TableCell>{booking.date}</TableCell>
                  <TableCell>{booking.time}</TableCell>
                  <TableCell>{booking.duration} hrs</TableCell>
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
    </div>
  );
}
