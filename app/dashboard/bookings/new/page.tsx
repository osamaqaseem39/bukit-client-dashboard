"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  createBookingApi,
  getLocationsApi,
  getFacilitiesByLocationApi,
} from "@/lib/api";
import type { Location, Facility } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewBookingPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [locationId, setLocationId] = useState<string>("");
  const [facilityId, setFacilityId] = useState<string>("");
  const [date, setDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [startTime, setStartTime] = useState<string>("18:00");
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [guestName, setGuestName] = useState<string>("");
  const [guestPhone, setGuestPhone] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const locs = await getLocationsApi(undefined);
        if (!isMounted) return;
        setLocations(locs);
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load locations");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadFacilities() {
      if (!locationId) {
        setFacilities([]);
        return;
      }
      try {
        const list = await getFacilitiesByLocationApi(locationId);
        if (!isMounted) return;
        setFacilities(list);
      } catch {
        if (isMounted) setFacilities([]);
      }
    }
    loadFacilities();
    return () => {
      isMounted = false;
    };
  }, [locationId]);

  function buildDateTime(): { start: Date; end: Date } {
    const [hours, minutes] = startTime.split(":").map((v) => parseInt(v, 10));
    const start = new Date(date);
    start.setHours(hours || 0, minutes || 0, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    return { start, end };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!locationId || !facilityId || !guestName || !guestPhone) {
      setError("Location, facility, guest name, and phone are required.");
      return;
    }

    const { start, end } = buildDateTime();

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await createBookingApi({
        location_id: locationId,
        facility_id: facilityId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        is_walk_in: true,
        guest_name: guestName,
        guest_phone: guestPhone,
        amount: amount ? Number(amount) : undefined,
      });
      setSuccess("Walk-in booking created successfully.");
      setTimeout(() => {
        router.push("/dashboard/bookings");
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          New walk-in booking
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Create a manual booking for a guest at your venue.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-success/40 bg-success/5 px-4 py-3 text-sm text-success">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-text-primary">
            Booking details
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Choose the location, facility, time, and guest information.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Location *
                </label>
                <select
                  className="mt-1 h-12 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3 text-[15px] text-gray-800 focus:border-fuchsia-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-100"
                  value={locationId}
                  onChange={(e) => {
                    setLocationId(e.target.value);
                    setFacilityId("");
                  }}
                >
                  <option value="">Select location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Facility *
                </label>
                <select
                  className="mt-1 h-12 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3 text-[15px] text-gray-800 focus:border-fuchsia-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-100"
                  value={facilityId}
                  onChange={(e) => setFacilityId(e.target.value)}
                  disabled={!locationId}
                >
                  <option value="">Select facility</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Input
                type="date"
                label="Date *"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <Input
                type="time"
                label="Start time *"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <Input
                type="number"
                label="Duration (minutes) *"
                min={15}
                step={15}
                value={durationMinutes}
                onChange={(e) =>
                  setDurationMinutes(Number(e.target.value || 60))
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Guest name *"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
              <Input
                label="Guest phone *"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Amount (optional)"
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Input label="Currency" value="PKR" disabled />
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/dashboard/bookings")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create booking"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

