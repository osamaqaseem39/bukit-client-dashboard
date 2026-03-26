"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  Facility,
  getFacilitiesByLocationApi,
  getLocationsApi,
  Location,
  updateFacilityAtLocationApi,
} from "@/lib/api";

type SetupMode = "games" | "prices" | "packages";

type PackageRow = {
  id: string;
  title: string;
  minutes: string;
  price: string;
  currency: string;
  validityHours: string;
};

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const TITLES: Record<SetupMode, string> = {
  games: "Games Setup",
  prices: "Prices Setup",
  packages: "Packages Setup",
};

const DESCRIPTIONS: Record<SetupMode, string> = {
  games: "Manage games available for a selected facility.",
  prices: "Manage per-minute pricing settings for a selected facility.",
  packages: "Manage package pricing options for a selected facility.",
};

export default function FacilitySetupFormPage({ mode }: { mode: SetupMode }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState("");

  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [gamesText, setGamesText] = useState("");
  const [newGame, setNewGame] = useState("");
  const [editingGameIndex, setEditingGameIndex] = useState<number | null>(null);
  const [editingGameValue, setEditingGameValue] = useState("");
  const [ratePerMinute, setRatePerMinute] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [billingIntervalMinutes, setBillingIntervalMinutes] = useState("10");
  const [minimumMinutes, setMinimumMinutes] = useState("");
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [editingPrice, setEditingPrice] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [packageDraft, setPackageDraft] = useState<PackageRow | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingLocations(true);
      setError(null);
      try {
        const data = await getLocationsApi();
        if (!mounted) return;
        setLocations(data || []);
        setSelectedLocationId(data?.[0]?.id || "");
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Failed to load locations");
      } finally {
        if (mounted) setLoadingLocations(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedLocationId) {
      setFacilities([]);
      setSelectedFacilityId("");
      return;
    }
    let mounted = true;
    setLoadingFacilities(true);
    setError(null);
    getFacilitiesByLocationApi(selectedLocationId)
      .then((data) => {
        if (!mounted) return;
        const nextFacilities = data || [];
        setFacilities(nextFacilities);
        setSelectedFacilityId(nextFacilities[0]?.id || "");
      })
      .catch((err: any) => {
        if (!mounted) return;
        setError(err?.message || "Failed to load facilities");
      })
      .finally(() => {
        if (mounted) setLoadingFacilities(false);
      });
    return () => {
      mounted = false;
    };
  }, [selectedLocationId]);

  const selectedFacility = useMemo(
    () => facilities.find((f) => f.id === selectedFacilityId) || null,
    [facilities, selectedFacilityId],
  );

  useEffect(() => {
    const metadata = (selectedFacility?.metadata || {}) as Record<string, any>;
    const pricing = metadata?.pricing || {};
    const gamesRaw = metadata?.games_available;
    const parsedGames = Array.isArray(gamesRaw)
      ? gamesRaw
      : typeof gamesRaw === "string"
        ? gamesRaw.split(",")
        : [];
    setGamesText(
      parsedGames
        .map((g: string) => g.trim())
        .filter(Boolean)
        .join("\n"),
    );

    const per = pricing?.per_minute;
    setRatePerMinute(
      per?.rate_per_minute != null ? String(per.rate_per_minute) : "",
    );
    setCurrency(
      typeof per?.currency === "string" && per.currency
        ? per.currency
        : "PKR",
    );
    setBillingIntervalMinutes(
      per?.billing_interval_minutes != null
        ? String(per.billing_interval_minutes)
        : "10",
    );
    setMinimumMinutes(
      per?.minimum_minutes != null ? String(per.minimum_minutes) : "",
    );

    const packageRows: PackageRow[] = Array.isArray(pricing?.packages)
      ? pricing.packages.map((pkg: any) => ({
          id: String(pkg?.id || makeId("pkg")),
          title: String(pkg?.title || ""),
          minutes: pkg?.minutes != null ? String(pkg.minutes) : "",
          price: pkg?.price != null ? String(pkg.price) : "",
          currency: String(pkg?.currency || "PKR"),
          validityHours:
            pkg?.validity_hours != null ? String(pkg.validity_hours) : "",
        }))
      : [];
    setPackages(packageRows);
    setNewGame("");
    setEditingGameIndex(null);
    setEditingGameValue("");
    setEditingPrice(false);
    setEditingPackageId(null);
    setPackageDraft(null);
  }, [selectedFacilityId, selectedFacility]);

  const gameList = useMemo(
    () =>
      gamesText
        .split(/\n|,/)
        .map((g) => g.trim())
        .filter(Boolean),
    [gamesText],
  );

  function addGame() {
    const next = newGame.trim();
    if (!next) return;
    if (gameList.some((g) => g.toLowerCase() === next.toLowerCase())) return;
    setGamesText([...gameList, next].join("\n"));
    setNewGame("");
  }

  function removeGame(index: number) {
    setGamesText(gameList.filter((_, i) => i !== index).join("\n"));
    if (editingGameIndex === index) {
      setEditingGameIndex(null);
      setEditingGameValue("");
    }
  }

  function startEditGame(index: number) {
    setEditingGameIndex(index);
    setEditingGameValue(gameList[index] || "");
  }

  function saveEditGame() {
    if (editingGameIndex == null) return;
    const next = editingGameValue.trim();
    if (!next) return;
    const updated = [...gameList];
    updated[editingGameIndex] = next;
    setGamesText(updated.join("\n"));
    setEditingGameIndex(null);
    setEditingGameValue("");
  }

  function startCreatePackage() {
    setEditingPackageId("__new__");
    setPackageDraft({
      id: makeId("pkg"),
      title: "",
      minutes: "",
      price: "",
      currency: "PKR",
      validityHours: "",
    });
  }

  function startEditPackage(pkg: PackageRow) {
    setEditingPackageId(pkg.id);
    setPackageDraft({ ...pkg });
  }

  function cancelPackageEdit() {
    setEditingPackageId(null);
    setPackageDraft(null);
  }

  function savePackageDraft() {
    if (!packageDraft || !editingPackageId) return;
    const validDraft = {
      ...packageDraft,
      title: packageDraft.title.trim(),
      currency: (packageDraft.currency || "PKR").toUpperCase(),
    };
    if (
      !validDraft.title ||
      !Number.isFinite(Number(validDraft.minutes)) ||
      Number(validDraft.minutes) <= 0 ||
      !Number.isFinite(Number(validDraft.price)) ||
      Number(validDraft.price) < 0
    ) {
      return;
    }
    if (editingPackageId === "__new__") {
      setPackages((prev) => [...prev, validDraft]);
    } else {
      setPackages((prev) =>
        prev.map((pkg) => (pkg.id === editingPackageId ? validDraft : pkg)),
      );
    }
    cancelPackageEdit();
  }

  async function handleSave() {
    if (!selectedLocationId || !selectedFacility) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const metadata = {
        ...((selectedFacility.metadata || {}) as Record<string, any>),
      };
      const pricing = {
        ...(metadata.pricing || {}),
      };

      if (mode === "games") {
        const games = gamesText
          .split(/\n|,/)
          .map((g) => g.trim())
          .filter(Boolean);
        metadata.games_available = games;
      }

      if (mode === "prices") {
        pricing.per_minute = {
          rate_per_minute: Number(ratePerMinute || 0),
          currency: (currency || "PKR").toUpperCase(),
          billing_interval_minutes: Number(billingIntervalMinutes || 10),
          ...(minimumMinutes.trim()
            ? { minimum_minutes: Number(minimumMinutes) }
            : {}),
        };
        metadata.pricing = pricing;
      }

      if (mode === "packages") {
        pricing.packages = packages
          .map((pkg) => ({
            id: pkg.id,
            title: pkg.title.trim(),
            minutes: Number(pkg.minutes || 0),
            price: Number(pkg.price || 0),
            currency: (pkg.currency || "PKR").toUpperCase(),
            ...(pkg.validityHours.trim()
              ? { validity_hours: Number(pkg.validityHours) }
              : {}),
          }))
          .filter(
            (pkg) =>
              pkg.title &&
              Number.isFinite(pkg.minutes) &&
              pkg.minutes > 0 &&
              Number.isFinite(pkg.price) &&
              pkg.price >= 0 &&
              pkg.currency,
          );
        metadata.pricing = pricing;
      }

      const updated = await updateFacilityAtLocationApi(
        selectedLocationId,
        selectedFacility.id,
        { metadata },
      );

      setFacilities((prev) =>
        prev.map((f) => (f.id === updated.id ? updated : f)),
      );
      setSuccess("Saved successfully.");
    } catch (err: any) {
      setError(err?.message || "Failed to save setup");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">{TITLES[mode]}</h1>
        <p className="mt-1 text-sm text-text-secondary">{DESCRIPTIONS[mode]}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-500/40 bg-green-500/5 px-4 py-3 text-sm text-green-600">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Location
              </label>
              <select
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                disabled={loadingLocations}
              >
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Facility
              </label>
              <select
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                disabled={loadingFacilities || !selectedLocationId}
              >
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedFacility ? (
            <div className="py-4 text-sm text-text-secondary">
              {loadingFacilities ? "Loading facilities..." : "Select a facility first."}
            </div>
          ) : (
            <div className="space-y-4">
              {mode === "games" && (
                <div className="space-y-3">
                  <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                    <Input
                      label="Add game"
                      value={newGame}
                      onChange={(e) => setNewGame(e.target.value)}
                      placeholder="e.g. Valorant"
                    />
                    <div className="flex items-end">
                      <Button variant="secondary" onClick={addGame}>
                        <Plus className="mr-1 h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-md border border-border">
                    {gameList.length === 0 ? (
                      <p className="p-3 text-sm text-text-secondary">No games added yet.</p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {gameList.map((game, idx) => (
                          <li
                            key={`${game}_${idx}`}
                            className="flex items-center justify-between gap-2 p-3"
                          >
                            {editingGameIndex === idx ? (
                              <div className="flex w-full items-center gap-2">
                                <Input
                                  label=""
                                  value={editingGameValue}
                                  onChange={(e) => setEditingGameValue(e.target.value)}
                                />
                                <Button size="sm" onClick={saveEditGame}>
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    setEditingGameIndex(null);
                                    setEditingGameValue("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <>
                                <span className="text-sm text-text-primary">{game}</span>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => startEditGame(idx)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => removeGame(idx)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {mode === "prices" && (
                <div className="space-y-3">
                  <div className="rounded-md border border-border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-text-primary">Current Price Setup</h3>
                      {!editingPrice && (
                        <Button size="sm" variant="secondary" onClick={() => setEditingPrice(true)}>
                          <Pencil className="mr-1 h-4 w-4" />
                          Edit
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-2 text-sm text-text-secondary md:grid-cols-2">
                      <div>Rate/min: {ratePerMinute || "-"}</div>
                      <div>Currency: {currency || "-"}</div>
                      <div>Billing interval: {billingIntervalMinutes || "-"} mins</div>
                      <div>Minimum minutes: {minimumMinutes || "-"}</div>
                    </div>
                  </div>
                  {editingPrice && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label="Rate per minute"
                        type="number"
                        step="any"
                        value={ratePerMinute}
                        onChange={(e) => setRatePerMinute(e.target.value)}
                      />
                      <Input
                        label="Currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                      />
                      <Input
                        label="Billing interval (minutes)"
                        type="number"
                        step="1"
                        value={billingIntervalMinutes}
                        onChange={(e) => setBillingIntervalMinutes(e.target.value)}
                      />
                      <Input
                        label="Minimum minutes (optional)"
                        type="number"
                        step="1"
                        value={minimumMinutes}
                        onChange={(e) => setMinimumMinutes(e.target.value)}
                      />
                    </div>
                  )}
                  {editingPrice && (
                    <div className="flex justify-end">
                      <Button variant="secondary" onClick={() => setEditingPrice(false)}>
                        <X className="mr-1 h-4 w-4" />
                        Done Editing
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {mode === "packages" && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button variant="secondary" onClick={startCreatePackage}>
                      <Plus className="mr-1 h-4 w-4" />
                      Add Package
                    </Button>
                  </div>

                  <div className="rounded-md border border-border">
                    {packages.length === 0 ? (
                      <p className="p-3 text-sm text-text-secondary">No packages added yet.</p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {packages.map((pkg) => (
                          <li
                            key={pkg.id}
                            className="flex items-center justify-between gap-2 p-3"
                          >
                            <div className="text-sm">
                              <div className="font-medium text-text-primary">{pkg.title}</div>
                              <div className="text-text-secondary">
                                {pkg.minutes} mins - {pkg.price} {pkg.currency}
                                {pkg.validityHours ? ` - ${pkg.validityHours}h validity` : ""}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => startEditPackage(pkg)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  setPackages((prev) =>
                                    prev.filter((entry) => entry.id !== pkg.id),
                                  )
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {packageDraft && editingPackageId && (
                    <div className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-6">
                      <div className="md:col-span-2">
                        <Input
                          label="Title"
                          value={packageDraft.title}
                          onChange={(e) =>
                            setPackageDraft((prev) =>
                              prev ? { ...prev, title: e.target.value } : prev,
                            )
                          }
                        />
                      </div>
                      <Input
                        label="Minutes"
                        type="number"
                        step="1"
                        value={packageDraft.minutes}
                        onChange={(e) =>
                          setPackageDraft((prev) =>
                            prev ? { ...prev, minutes: e.target.value } : prev,
                          )
                        }
                      />
                      <Input
                        label="Price"
                        type="number"
                        step="any"
                        value={packageDraft.price}
                        onChange={(e) =>
                          setPackageDraft((prev) =>
                            prev ? { ...prev, price: e.target.value } : prev,
                          )
                        }
                      />
                      <Input
                        label="Currency"
                        value={packageDraft.currency}
                        onChange={(e) =>
                          setPackageDraft((prev) =>
                            prev
                              ? { ...prev, currency: e.target.value.toUpperCase() }
                              : prev,
                          )
                        }
                      />
                      <div className="flex items-end gap-2">
                        <Input
                          label="Validity hours"
                          type="number"
                          step="1"
                          value={packageDraft.validityHours}
                          onChange={(e) =>
                            setPackageDraft((prev) =>
                              prev ? { ...prev, validityHours: e.target.value } : prev,
                            )
                          }
                        />
                      </div>
                      <div className="md:col-span-6 flex justify-end gap-2">
                        <Button variant="secondary" onClick={cancelPackageEdit}>
                          Cancel
                        </Button>
                        <Button onClick={savePackageDraft}>Save Package</Button>
                      </div>
                    </div>
                  )}

                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving || !selectedFacilityId}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Setup"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
