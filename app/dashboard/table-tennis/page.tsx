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

const tableTennisFacilities = [
  {
    id: "1",
    name: "Table Tennis Court 1",
    location: "Downtown",
    status: "active",
    hourlyRate: 60,
    totalBookings: 110,
    revenue: 6600,
  },
  {
    id: "2",
    name: "Table Tennis Court 2",
    location: "Uptown",
    status: "active",
    hourlyRate: 60,
    totalBookings: 105,
    revenue: 6300,
  },
  {
    id: "3",
    name: "Table Tennis Court 3",
    location: "Midtown",
    status: "active",
    hourlyRate: 55,
    totalBookings: 92,
    revenue: 5060,
  },
  {
    id: "4",
    name: "Table Tennis Court 4",
    location: "Suburbs",
    status: "active",
    hourlyRate: 50,
    totalBookings: 78,
    revenue: 3900,
  },
];

export default function TableTennisPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFacilities = tableTennisFacilities.filter((facility) =>
    facility.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Table Tennis Facilities
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your table tennis courts and facilities
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Court
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Input
              type="search"
              placeholder="Search table tennis courts..."
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
            All Table Tennis Courts
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
        title="Add New Table Tennis Court"
        size="lg"
      >
        <div className="space-y-4">
          <Input label="Court Name" placeholder="Enter court name" />
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
            <Button onClick={() => setIsModalOpen(false)}>Create Court</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
