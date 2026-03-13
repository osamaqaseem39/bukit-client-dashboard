"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapPin, Search } from "lucide-react";
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
import type { Facility, FacilityStatus, Location } from "@/lib/api";
import {
  getFacilitiesByLocationApi,
  getLocationsApi,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const ARENA_FACILITY_TYPES = new Set<string>([
  "futsal-field",
  "cricket-pitch",
  "padel-court",
]);

const ARENA_TYPE_LABELS: Record<string, string> = {
  "futsal-field": "Futsal Field",
  "cricket-pitch": "Cricket Pitch",
  "padel-court": "Padel Court",
};

function formatArenaType(type: string) {
  return ARENA_TYPE_LABELS[type] || type;
}

function formatStatus(status: FacilityStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function ArenaPage() {
  const { isClient } = useAuth();
  const searchParams = useSearchParams();

  const clientId = isClient() ? undefined : searchParams.get("clientId") || undefined;

  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArenaType, setSelectedArenaType] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    setLocationsLoading(true);
    setError(null);
    getLocationsApi(clientId)
      .then((data) => {
        if (isMounted) setLocations(data);
      })
      .catch((err: any) => {
        if (isMounted) setError(err.message || "Failed to load locations");
      })
      .finally(() => {
        if (isMounted) setLocationsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [clientId]);

  useEffect(() => {
    if (!selectedLocationId) {
      setFacilities([]);
      return;
    }
    let isMounted = true;
    setFacilitiesLoading(true);
    setError(null);
    getFacilitiesByLocationApi(selectedLocationId)
      .then((data) => {
        if (isMounted) {
          setFacilities(
            data.filter((f) => ARENA_FACILITY_TYPES.has(f.type))
          );
        }
      })
      .catch((err: any) => {
        if (isMounted) setError(err.message || "Failed to load arena facilities");
      })
      .finally(() => {
        if (isMounted) setFacilitiesLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedLocationId]);

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === selectedLocationId) ?? null,
    [locations, selectedLocationId]
  );

  const filteredFacilities = useMemo(() => {
    return facilities.filter((facility) => {
      const matchesSearch =
        !searchQuery ||
        facility.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType =
        !selectedArenaType || facility.type === selectedArenaType;
      return matchesSearch && matchesType;
    });
  }, [facilities, searchQuery, selectedArenaType]);

  const stats = useMemo(() => {
    const total = facilities.length;
    const active = facilities.filter((f) => f.status === "active").length;
    const maintenance = facilities.filter(
      (f) => f.status === "maintenance"
    ).length;
    return { total, active, maintenance };
  }, [facilities]);

  const arenaTypeOptions = Array.from(ARENA_FACILITY_TYPES);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          Arena
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          View and manage arena facilities (cricket, futsal, padel) per location.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-text-primary">
            Select location
          </h2>
          <p className="text-sm text-text-secondary">
            Choose a location to see its arena facilities.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {locationsLoading ? (
              <div className="flex items-center justify-center py-6 text-sm text-text-secondary">
                Loading locations…
              </div>
            ) : locations.length === 0 ? (
              <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-text-secondary">
                No locations found. Please create a location first in setup.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {locations.map((loc) => {
                  const isSelected = loc.id === selectedLocationId;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => setSelectedLocationId(loc.id)}
                      className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left text-sm transition ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-surface-elevated/60 hover:border-primary/60 hover:bg-surface-elevated"
                      }`}
                    >
                      <div className="mb-1 flex w-full items-center justify-between gap-2">
                        <span className="font-medium text-text-primary">
                          {loc.name}
                        </span>
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                            isSelected
                              ? "border-primary bg-primary text-white"
                              : "border-border bg-background text-transparent"
                          } text-[10px] font-bold`}
                        >
                          ✓
                        </span>
                      </div>
                      {(loc.city || loc.address) && (
                        <span className="text-xs text-text-secondary">
                          {loc.city || loc.address}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedLocationId && (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="mx-auto h-12 w-12 text-text-secondary/60" />
            <p className="mt-3 text-sm font-medium text-text-primary">
              Select a location above
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Then you can view arena facilities (cricket, futsal, padel) for that location.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedLocationId && (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-text-secondary">Total</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {stats.total}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-text-secondary">Active</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {stats.active}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-text-secondary">Maintenance</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {stats.maintenance}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row">
                <Input
                  type="search"
                  placeholder="Search arena facilities by name..."
                  icon={<Search className="h-4 w-4" />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <div className="w-full sm:w-48">
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Arena type
                  </label>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={selectedArenaType}
                    onChange={(e) => setSelectedArenaType(e.target.value)}
                  >
                    <option value="">All</option>
                    {arenaTypeOptions.map((value) => (
                      <option key={value} value={value}>
                        {formatArenaType(value)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-text-primary">
                {selectedLocation
                  ? `Arena facilities at ${selectedLocation.name}`
                  : "Arena facilities"}
              </h2>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Arena type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Capacity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facilitiesLoading && filteredFacilities.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-8 text-center text-sm text-text-secondary"
                      >
                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                      </TableCell>
                    </TableRow>
                  )}
                  {!facilitiesLoading &&
                    filteredFacilities.map((facility) => (
                      <TableRow key={facility.id}>
                        <TableCell className="font-medium">
                          {facility.name}
                        </TableCell>
                        <TableCell>{formatArenaType(facility.type)}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              facility.status === "active"
                                ? "bg-success/10 text-success"
                                : facility.status === "maintenance"
                                ? "bg-warning/10 text-warning"
                                : "bg-border text-text-secondary"
                            }`}
                          >
                            {formatStatus(facility.status)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {facility.capacity != null ? facility.capacity : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  {!facilitiesLoading && filteredFacilities.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-8 text-center text-sm text-text-secondary"
                      >
                        No arena facilities yet for this location.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

