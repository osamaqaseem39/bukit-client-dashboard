"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapPin, Plus } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Location, getLocationsApi } from "@/lib/api";

export default function LocationsPage() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId") || undefined;

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getLocationsApi(clientId)
      .then((data) => {
        if (isMounted) {
          setLocations(data);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err.message || "Failed to load locations");
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
  }, [clientId]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Locations
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your business locations
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Location
        </Button>
      </div>

      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}

      {/* Locations Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading && locations.length === 0 && (
          <p className="text-sm text-text-secondary">Loading locations...</p>
        )}
        {!loading &&
          locations.map((location) => (
            <Card key={location.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">
                      {location.name}
                    </h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      {[location.city, location.state, location.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                  <MapPin className="h-5 w-5 text-text-secondary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary">
                  {location.address}
                </p>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-text-primary">
            All Locations
          </h2>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Country</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell className="font-medium">
                    {location.name}
                  </TableCell>
                  <TableCell>{location.address}</TableCell>
                  <TableCell>{location.city}</TableCell>
                  <TableCell>{location.state}</TableCell>
                  <TableCell>{location.country}</TableCell>
                </TableRow>
              ))}
              {!loading && locations.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-sm text-text-secondary"
                  >
                    No locations found.
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
