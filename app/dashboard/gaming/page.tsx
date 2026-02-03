"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { ImageUpload } from "@/components/ui";
import { GamingCenter, getGamingCentersApi } from "@/lib/api";

export default function GamingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [coverUrl, setCoverUrl] = useState<string | undefined>();
  const [gamingCenters, setGamingCenters] = useState<GamingCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getGamingCentersApi()
      .then((data) => {
        if (isMounted) {
          setGamingCenters(data);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err.message || "Failed to load gaming zones");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredGamingZones = useMemo(
    () =>
      gamingCenters.filter((gamingZone) =>
        gamingZone.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [gamingCenters, searchQuery]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Gaming Zones
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your gaming zones
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Gaming Zone
        </Button>
      </div>

      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Input
              type="search"
              placeholder="Search gaming zones..."
              icon={<Search className="h-4 w-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Gaming Zones Table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-text-primary">
            All Gaming Zones
          </h2>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGamingZones.map((gamingZone) => (
                <TableRow key={gamingZone.id}>
                  <TableCell className="font-medium">
                    {gamingZone.name}
                  </TableCell>
                  <TableCell>{gamingZone.city}</TableCell>
                  <TableCell>{gamingZone.country}</TableCell>
                  <TableCell>
                    {gamingZone.hourly_rate != null ? `$${gamingZone.hourly_rate}/hr` : "-"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        gamingZone.status === "active"
                          ? "bg-success/10 text-success"
                          : gamingZone.status === "maintenance"
                            ? "bg-warning/10 text-warning"
                            : "bg-text-secondary/10 text-text-secondary"
                      }`}
                    >
                      {gamingZone.status}
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
              {!loading && filteredGamingZones.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-sm text-text-secondary"
                  >
                    No gaming zones found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Gaming Zone Modal (UI only for now) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Gaming Zone"
        size="lg"
      >
        <div className="space-y-4">
          <Input label="Gaming Zone Name" placeholder="Enter gaming zone name" />
          <Input label="City" placeholder="Enter city" />
          <Input label="Country" placeholder="Enter country" />
          <Input
            label="Hourly Rate"
            type="number"
            placeholder="Enter hourly rate"
          />
          <ImageUpload
            label="Logo"
            value={logoUrl}
            onChange={setLogoUrl}
          />
          <ImageUpload
            label="Cover Image"
            value={coverUrl}
            onChange={setCoverUrl}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsModalOpen(false)}>Create Gaming Zone</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
