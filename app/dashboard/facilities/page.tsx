\"use client\";

import React, { useEffect, useMemo, useState } from \"react\";
import { Filter, MapPin, Search } from \"lucide-react\";
import { Card, CardContent, CardHeader } from \"@/components/ui/Card\";
import Button from \"@/components/ui/Button\";
import Input from \"@/components/ui/Input\";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from \"@/components/ui/Table\";
import {
  Facility,
  FacilityStatus,
  GetFacilitiesParams,
  Location,
  getFacilitiesApi,
  getLocationsApi,
} from \"@/lib/api\";

const FACILITY_TYPE_LABELS: Record<string, string> = {
  \"gaming-pc\": \"Gaming PC\",
  vr: \"VR\",
  ps4: \"PS4\",
  ps5: \"PS5\",
  xbox: \"XBOX\",
  \"snooker-table\": \"Snooker Table\",
  \"table-tennis-table\": \"Table Tennis Table\",
  \"futsal-field\": \"Futsal Field\",
  \"cricket-pitch\": \"Cricket Pitch\",
  \"padel-court\": \"Padel Court\",
  other: \"Other\",
};

function formatFacilityType(type: string) {
  return FACILITY_TYPE_LABELS[type] || type;
}

function formatStatus(status: FacilityStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState(\"\"\);
  const [selectedType, setSelectedType] = useState<string>(\"\");
  const [selectedLocationId, setSelectedLocationId] = useState<string>(\"\");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [facilitiesRes, locationsRes] = await Promise.all([
          getFacilitiesApi({} as GetFacilitiesParams),
          getLocationsApi(),
        ]);

        if (!isMounted) return;

        setFacilities(facilitiesRes);
        setLocations(locationsRes);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || \"Failed to load facilities\");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const locationById = useMemo(() => {
    const map = new Map<string, Location>();
    locations.forEach((loc) => {
      map.set(loc.id, loc);
    });
    return map;
  }, [locations]);

  const filteredFacilities = useMemo(() => {
    return facilities.filter((facility) => {
      const matchesSearch =
        !searchQuery ||
        facility.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = !selectedType || facility.type === selectedType;

      const matchesLocation =
        !selectedLocationId || facility.location_id === selectedLocationId;

      return matchesSearch && matchesType && matchesLocation;
    });
  }, [facilities, searchQuery, selectedType, selectedLocationId]);

  const stats = useMemo(() => {
    const total = facilities.length;
    const active = facilities.filter(
      (f) => f.status === FacilityStatus.ACTIVE
    ).length;
    const maintenance = facilities.filter(
      (f) => f.status === FacilityStatus.MAINTENANCE
    ).length;

    return { total, active, maintenance };
  }, [facilities]);

  return (
    <div className=\"space-y-6\">
      {/* Page Header */}
      <div className=\"flex items-center justify-between\">
        <div>
          <h1 className=\"text-2xl font-semibold text-text-primary\">
            Facilities
          </h1>
          <p className=\"mt-1 text-sm text-text-secondary\">
            Search and manage facilities across all locations
          </p>
        </div>
        <Button>
          <Filter className=\"mr-2 h-4 w-4\" />
          Advanced Filters
        </Button>
      </div>

      {error && (
        <p className=\"text-sm text-error\" role=\"alert\">
          {error}
        </p>
      )}

      {/* Stats */}
      <div className=\"grid gap-6 md:grid-cols-3\">
        <Card>
          <CardContent className=\"pt-6\">
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"text-sm font-medium text-text-secondary\">
                  Total Facilities
                </p>
                <p className=\"mt-2 text-2xl font-semibold text-text-primary\">
                  {stats.total}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className=\"pt-6\">
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"text-sm font-medium text-text-secondary\">
                  Active
                </p>
                <p className=\"mt-2 text-2xl font-semibold text-text-primary\">
                  {stats.active}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className=\"pt-6\">
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"text-sm font-medium text-text-secondary\">
                  In Maintenance
                </p>
                <p className=\"mt-2 text-2xl font-semibold text-text-primary\">
                  {stats.maintenance}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className=\"pt-6 space-y-4\">
          <div className=\"flex flex-col gap-4 md:flex-row\">
            <Input
              type=\"search\"
              placeholder=\"Search facilities by name...\"
              icon={<Search className=\"h-4 w-4\" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className=\"flex-1\"
            />

            <div className=\"flex flex-1 flex-col gap-4 md:flex-row\">
              <div className=\"flex-1\">
                <label className=\"mb-1 block text-xs font-medium text-text-secondary\">
                  Type
                </label>
                <select
                  className=\"w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40\"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value=\"\">All types</option>
                  {Object.entries(FACILITY_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className=\"flex-1\">
                <label className=\"mb-1 block text-xs font-medium text-text-secondary\">
                  Location
                </label>
                <select
                  className=\"w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40\"
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                >
                  <option value=\"\">All locations</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Facilities Table */}
      <Card>
        <CardHeader>
          <h2 className=\"text-lg font-medium text-text-primary\">
            All Facilities
          </h2>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Capacity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && filteredFacilities.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className=\"py-8 text-center text-sm text-text-secondary\"
                  >
                    Loading facilities...
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                filteredFacilities.map((facility) => {
                  const location = locationById.get(facility.location_id);
                  const locationLabel = location
                    ? [
                        location.name,
                        location.city,
                        location.country,
                      ]
                        .filter(Boolean)
                        .join(\", \")
                    : facility.location_id;

                  return (
                    <TableRow key={facility.id}>
                      <TableCell className=\"font-medium\">
                        {facility.name}
                      </TableCell>
                      <TableCell>{formatFacilityType(facility.type)}</TableCell>
                      <TableCell>
                        <div className=\"flex items-center gap-2\">
                          <MapPin className=\"h-4 w-4 text-text-secondary\" />
                          <span>{locationLabel}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            facility.status === FacilityStatus.ACTIVE
                              ? \"bg-success/10 text-success\"
                              : facility.status === FacilityStatus.MAINTENANCE
                              ? \"bg-warning/10 text-warning\"
                              : \"bg-border text-text-secondary\"
                          }`}
                        >
                          {formatStatus(facility.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {facility.capacity != null ? facility.capacity : \"-\"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              {!loading && filteredFacilities.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className=\"py-8 text-center text-sm text-text-secondary\"
                  >
                    No facilities found.
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

