"use client";

import React, { useState } from "react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";

const snookerFacilities = [
  {
    id: "1",
    name: "Snooker Table 1",
    location: "Downtown",
    status: "active",
    hourlyRate: 80,
    totalBookings: 95,
    revenue: 7600,
  },
  {
    id: "2",
    name: "Snooker Table 2",
    location: "Uptown",
    status: "active",
    hourlyRate: 80,
    totalBookings: 88,
    revenue: 7040,
  },
  {
    id: "3",
    name: "Snooker Table 3",
    location: "Midtown",
    status: "active",
    hourlyRate: 75,
    totalBookings: 72,
    revenue: 5400,
  },
  {
    id: "4",
    name: "Snooker Table 4",
    location: "Suburbs",
    status: "maintenance",
    hourlyRate: 70,
    totalBookings: 45,
    revenue: 3150,
  },
];

export default function SnookerPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFacilities = snookerFacilities.filter((facility) =>
    facility.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Snooker Facilities
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your snooker tables and facilities
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Table
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Input
              type="search"
              placeholder="Search snooker tables..."
              icon={<Search className="h-4 w-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Facilities Table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-text-primary">
            All Snooker Tables
          </h2>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>Total Bookings</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFacilities.map((facility) => (
                <TableRow key={facility.id}>
                  <TableCell className="font-medium">{facility.name}</TableCell>
                  <TableCell>{facility.location}</TableCell>
                  <TableCell>${facility.hourlyRate}/hr</TableCell>
                  <TableCell>{facility.totalBookings}</TableCell>
                  <TableCell>${facility.revenue.toLocaleString()}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        facility.status === "active"
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {facility.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Facility Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Snooker Table"
        size="lg"
      >
        <div className="space-y-4">
          <Input label="Table Name" placeholder="Enter table name" />
          <Input label="Location" placeholder="Enter location" />
          <Input
            label="Hourly Rate"
            type="number"
            placeholder="Enter hourly rate"
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsModalOpen(false)}>Create Table</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
