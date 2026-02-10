"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  createClientWithUserApi,
  createFacilityApi,
  createLocationApi,
  FacilityPayload,
  LocationPayload,
} from "@/lib/api";

type WizardStep = 1 | 2 | 3;

interface StepErrorState {
  global?: string | null;
  fields: Record<string, string | null>;
}

const initialErrorState: StepErrorState = {
  global: null,
  fields: {},
};

export default function ClientOnboardingPage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [locationChoices, setLocationChoices] = useState<
    { id: string; name: string }[]
  >([]);

  // Step 1: Business information
  const [businessForm, setBusinessForm] = useState({
    companyName: "",
    legalName: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    taxId: "",
    registrationNumber: "",
    description: "",
    logoUrl: "",
    adminPassword: "",
  });
  const [step1Errors, setStep1Errors] = useState<StepErrorState>(
    initialErrorState
  );

  // Step 2: Locations
  const [locations, setLocations] = useState<LocationPayload[]>([
    {
      name: "",
      address: "",
      city: "",
      state: "",
      country: "",
      phone: "",
      latitude: undefined,
      longitude: undefined,
    },
  ]);
  const [step2Errors, setStep2Errors] = useState<StepErrorState>(
    initialErrorState
  );

  // Step 3: Facilities
  const [facilities, setFacilities] = useState<FacilityPayload[]>([
    {
      name: "",
      type: "other",
      status: "active",
      location_id: "",
      capacity: undefined,
    },
  ]);
  const [step3Errors, setStep3Errors] = useState<StepErrorState>(
    initialErrorState
  );

  const locationOptions = useMemo(
    () =>
      locationChoices.map((loc) => ({
        id: loc.id,
        label: loc.name || "Unnamed location",
      })),
    [locationChoices]
  );

  function goToStep(step: WizardStep) {
    setCurrentStep(step);
  }

  function handleBusinessChange(
    field: keyof typeof businessForm,
    value: string
  ) {
    setBusinessForm((prev) => ({ ...prev, [field]: value }));
    setStep1Errors((prev) => ({
      global: null,
      fields: { ...prev.fields, [field]: null },
    }));
  }

  function handleLocationChange(
    index: number,
    field: keyof LocationPayload,
    value: string
  ) {
    setLocations((prev) =>
      prev.map((loc, i) =>
        i === index
          ? {
              ...loc,
              [field]:
                field === "latitude" || field === "longitude"
                  ? value === ""
                    ? undefined
                    : Number(value)
                  : value,
            }
          : loc
      )
    );
    setStep2Errors((prev) => ({
      global: null,
      fields: { ...prev.fields, [`${index}.${field}`]: null },
    }));
  }

  function addLocation() {
    setLocations((prev) => [
      ...prev,
      {
        name: "",
        address: "",
        city: "",
        state: "",
        country: "",
        phone: "",
        latitude: undefined,
        longitude: undefined,
      },
    ]);
  }

  function removeLocation(index: number) {
    setLocations((prev) => prev.filter((_, i) => i !== index));
  }

  function handleFacilityChange(
    index: number,
    field: keyof FacilityPayload,
    value: string
  ) {
    setFacilities((prev) =>
      prev.map((fac, i) =>
        i === index
          ? {
              ...fac,
              [field]:
                field === "capacity"
                  ? value === ""
                    ? undefined
                    : Number(value)
                  : value,
            }
          : fac
      )
    );
    setStep3Errors((prev) => ({
      global: null,
      fields: { ...prev.fields, [`${index}.${field}`]: null },
    }));
  }

  function addFacility() {
    setFacilities((prev) => [
      ...prev,
      {
        name: "",
        type: "other",
        status: "active",
        location_id: "",
        capacity: undefined,
      },
    ]);
  }

  function removeFacility(index: number) {
    setFacilities((prev) => prev.filter((_, i) => i !== index));
  }

  function validateStep1(): boolean {
    const errors: StepErrorState = { global: null, fields: {} };

    if (!businessForm.companyName.trim()) {
      errors.fields.companyName = "Company name is required";
    }
    if (!businessForm.contactName.trim()) {
      errors.fields.contactName = "Contact person is required";
    }
    if (!businessForm.email.trim()) {
      errors.fields.email = "Email is required";
    }
    if (!businessForm.phone.trim()) {
      errors.fields.phone = "Phone is required";
    }
    if (!businessForm.city.trim()) {
      errors.fields.city = "City is required";
    }
    if (!businessForm.country.trim()) {
      errors.fields.country = "Country is required";
    }
    if (!businessForm.adminPassword.trim()) {
      errors.fields.adminPassword = "Admin password is required";
    } else if (businessForm.adminPassword.trim().length < 6) {
      errors.fields.adminPassword = "Password must be at least 6 characters";
    }

    if (Object.keys(errors.fields).length > 0) {
      errors.global = "Please fill in all required fields.";
      setStep1Errors(errors);
      return false;
    }

    setStep1Errors(initialErrorState);
    return true;
  }

  function validateStep2(): boolean {
    const errors: StepErrorState = { global: null, fields: {} };

    if (locations.length === 0) {
      errors.global = "Add at least one location to continue.";
    }

    locations.forEach((loc, index) => {
      if (!loc.name?.trim()) {
        errors.fields[`${index}.name`] = "Location name is required";
      }
      if (!loc.city?.trim()) {
        errors.fields[`${index}.city`] = "City is required";
      }
      if (!loc.country?.trim()) {
        errors.fields[`${index}.country`] = "Country is required";
      }
    });

    if (Object.keys(errors.fields).length > 0 || errors.global) {
      if (!errors.global) {
        errors.global = "Please complete the required fields for locations.";
      }
      setStep2Errors(errors);
      return false;
    }

    setStep2Errors(initialErrorState);
    return true;
  }

  function validateStep3(): boolean {
    const errors: StepErrorState = { global: null, fields: {} };

    if (facilities.length === 0) {
      errors.global = "Add at least one facility to continue.";
    }

    facilities.forEach((fac, index) => {
      if (!fac.name?.trim()) {
        errors.fields[`${index}.name`] = "Facility name is required";
      }
      if (!fac.type?.trim()) {
        errors.fields[`${index}.type`] = "Type is required";
      }
      if (!fac.location_id?.trim()) {
        errors.fields[`${index}.location_id`] = "Location is required";
      }
    });

    if (Object.keys(errors.fields).length > 0 || errors.global) {
      if (!errors.global) {
        errors.global = "Please complete the required fields for facilities.";
      }
      setStep3Errors(errors);
      return false;
    }

    setStep3Errors(initialErrorState);
    return true;
  }

  async function handleSubmitStep1() {
    if (!validateStep1()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        user: {
          name:
            businessForm.contactName.trim() ||
            businessForm.companyName.trim() ||
            businessForm.email,
          email: businessForm.email,
          password: businessForm.adminPassword,
        },
        client: {
          company_name: businessForm.companyName,
          legal_name: businessForm.legalName || undefined,
          contact_name: businessForm.contactName,
          email: businessForm.email,
          phone: businessForm.phone,
          address: businessForm.address || undefined,
          city: businessForm.city,
          country: businessForm.country,
          tax_id: businessForm.taxId || undefined,
          company_registration_number:
            businessForm.registrationNumber || undefined,
          description: businessForm.description || undefined,
          logo_url: businessForm.logoUrl || undefined,
        },
      };

      const result = await createClientWithUserApi(payload);

      const createdClientId =
        (result as any)?.client?.id ||
        (result as any)?.client_id ||
        (result as any)?.id;

      if (!createdClientId) {
        throw new Error("Client ID missing from response");
      }

      setClientId(createdClientId);
      setCurrentStep(2);
    } catch (err: any) {
      setStep1Errors({
        global: err.message || "Failed to create client",
        fields: {},
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmitStep2() {
    if (!clientId) {
      setStep2Errors({
        global:
          "Client has not been created yet. Please complete Step 1 first.",
        fields: {},
      });
      setCurrentStep(1);
      return;
    }

    if (!validateStep2()) return;

    setIsSubmitting(true);
    try {
      const createdLocations: { id: string; name: string }[] = [];
      for (const loc of locations) {
        const payload: LocationPayload = {
          ...loc,
          client_id: clientId,
        };
        const result = await createLocationApi(payload);
        createdLocations.push({
          id: (result as any).id,
          name: (result as any).name,
        });
      }

      // Pre-populate facilities location_id with the first created location if empty
      if (createdLocations.length > 0) {
        setLocationChoices(createdLocations);
        setFacilities((prev) =>
          prev.map((fac) =>
            !fac.location_id
              ? { ...fac, location_id: createdLocations[0].id }
              : fac
          )
        );
      }

      setCurrentStep(3);
    } catch (err: any) {
      setStep2Errors({
        global: err.message || "Failed to create locations",
        fields: {},
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmitStep3() {
    if (!validateStep3()) return;

    setIsSubmitting(true);
    try {
      for (const fac of facilities) {
        await createFacilityApi(fac);
      }

      // On success, redirect to dashboard or clients list
      router.push("/dashboard");
    } catch (err: any) {
      setStep3Errors({
        global: err.message || "Failed to create facilities",
        fields: {},
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          New Business Onboarding
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Step {currentStep} of 3 — Business information, locations, and
          facilities.
        </p>
      </div>

      {/* Stepper */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { step: 1, label: "Business" },
          { step: 2, label: "Locations" },
          { step: 3, label: "Facilities" },
        ].map((item) => {
          const isActive = currentStep === item.step;
          const isCompleted = currentStep > (item.step as number);
          return (
            <div
              key={item.step}
              className={`rounded-lg border px-4 py-3 text-sm ${
                isActive
                  ? "border-primary bg-primary/5 text-primary"
                  : isCompleted
                  ? "border-success bg-success/5 text-success"
                  : "border-border bg-surface-elevated/60 text-text-secondary"
              }`}
            >
              <div className="font-medium">
                Step {item.step}: {item.label}
              </div>
              <div className="text-xs">
                {item.step === 1 &&
                  "Business profile & primary contact details."}
                {item.step === 2 && "Create at least one operating location."}
                {item.step === 3 &&
                  "Add initial facilities for the new business."}
              </div>
            </div>
          );
        })}
      </div>

      {/* Steps */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-text-primary">
              Step 1 — Business information
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Capture the business profile and primary contact details for this
              client.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {step1Errors.global && (
              <div className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-500">
                {step1Errors.global}
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Company name *"
                placeholder="e.g. Bukit Gaming Lounge"
                value={businessForm.companyName}
                onChange={(e) =>
                  handleBusinessChange("companyName", e.target.value)
                }
                error={step1Errors.fields.companyName ?? undefined}
              />
              <Input
                label="Legal name"
                placeholder="Registered legal entity name"
                value={businessForm.legalName}
                onChange={(e) =>
                  handleBusinessChange("legalName", e.target.value)
                }
              />
              <Input
                label="Contact person *"
                placeholder="Primary contact person"
                value={businessForm.contactName}
                onChange={(e) =>
                  handleBusinessChange("contactName", e.target.value)
                }
                error={step1Errors.fields.contactName ?? undefined}
              />
              <Input
                label="Email *"
                type="email"
                placeholder="contact@business.com"
                value={businessForm.email}
                onChange={(e) =>
                  handleBusinessChange("email", e.target.value)
                }
                error={step1Errors.fields.email ?? undefined}
              />
              <Input
                label="Phone *"
                placeholder="+1 555 123 4567"
                value={businessForm.phone}
                onChange={(e) =>
                  handleBusinessChange("phone", e.target.value)
                }
                error={step1Errors.fields.phone ?? undefined}
              />
              <Input
                label="Admin password *"
                type="password"
                placeholder="Set an admin password for this business"
                value={businessForm.adminPassword}
                onChange={(e) =>
                  handleBusinessChange("adminPassword", e.target.value)
                }
                error={step1Errors.fields.adminPassword ?? undefined}
              />
              <Input
                label="Address"
                placeholder="Street and number"
                value={businessForm.address}
                onChange={(e) =>
                  handleBusinessChange("address", e.target.value)
                }
              />
              <Input
                label="City *"
                value={businessForm.city}
                onChange={(e) =>
                  handleBusinessChange("city", e.target.value)
                }
                error={step1Errors.fields.city ?? undefined}
              />
              <Input
                label="Country *"
                value={businessForm.country}
                onChange={(e) =>
                  handleBusinessChange("country", e.target.value)
                }
                error={step1Errors.fields.country ?? undefined}
              />
              <Input
                label="Tax ID"
                placeholder="Tax identification number"
                value={businessForm.taxId}
                onChange={(e) =>
                  handleBusinessChange("taxId", e.target.value)
                }
              />
              <Input
                label="Registration number"
                placeholder="Company registration number"
                value={businessForm.registrationNumber}
                onChange={(e) =>
                  handleBusinessChange("registrationNumber", e.target.value)
                }
              />
              <Input
                label="Logo URL"
                placeholder="https://..."
                value={businessForm.logoUrl}
                onChange={(e) =>
                  handleBusinessChange("logoUrl", e.target.value)
                }
              />
            </div>
            <Input
              label="Description"
              placeholder="Short description of the business"
              value={businessForm.description}
              onChange={(e) =>
                handleBusinessChange("description", e.target.value)
              }
            />

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => router.push("/dashboard")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitStep1} disabled={isSubmitting}>
                {isSubmitting ? "Creating client..." : "Save & continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-text-primary">
              Step 2 — Location information
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Add at least one physical location where this business operates.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {step2Errors.global && (
              <div className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-500">
                {step2Errors.global}
              </div>
            )}

            <div className="space-y-6">
              {locations.map((loc, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border-primary bg-surface-elevated/60 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-medium text-text-primary">
                      Location {index + 1}
                    </div>
                    {locations.length > 1 && (
                      <button
                        type="button"
                        className="text-xs text-red-500 hover:underline"
                        onClick={() => removeLocation(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Location name *"
                      placeholder="e.g. Downtown Branch"
                      value={loc.name}
                      onChange={(e) =>
                        handleLocationChange(index, "name", e.target.value)
                      }
                      error={
                        step2Errors.fields[`${index}.name`] ?? undefined
                      }
                    />
                    <Input
                      label="Phone"
                      placeholder="+1 555 123 4567"
                      value={loc.phone || ""}
                      onChange={(e) =>
                        handleLocationChange(index, "phone", e.target.value)
                      }
                    />
                    <Input
                      label="Address"
                      placeholder="Street and number"
                      value={loc.address || ""}
                      onChange={(e) =>
                        handleLocationChange(index, "address", e.target.value)
                      }
                    />
                    <Input
                      label="City *"
                      value={loc.city || ""}
                      onChange={(e) =>
                        handleLocationChange(index, "city", e.target.value)
                      }
                      error={
                        step2Errors.fields[`${index}.city`] ?? undefined
                      }
                    />
                    <Input
                      label="State / Region"
                      value={loc.state || ""}
                      onChange={(e) =>
                        handleLocationChange(index, "state", e.target.value)
                      }
                    />
                    <Input
                      label="Country *"
                      value={loc.country || ""}
                      onChange={(e) =>
                        handleLocationChange(index, "country", e.target.value)
                      }
                      error={
                        step2Errors.fields[`${index}.country`] ?? undefined
                      }
                    />
                    <Input
                      label="Latitude"
                      placeholder="Optional"
                      value={
                        typeof loc.latitude === "number"
                          ? String(loc.latitude)
                          : ""
                      }
                      onChange={(e) =>
                        handleLocationChange(index, "latitude", e.target.value)
                      }
                    />
                    <Input
                      label="Longitude"
                      placeholder="Optional"
                      value={
                        typeof loc.longitude === "number"
                          ? String(loc.longitude)
                          : ""
                      }
                      onChange={(e) =>
                        handleLocationChange(
                          index,
                          "longitude",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div>
              <Button
                type="button"
                variant="secondary"
                onClick={addLocation}
                disabled={isSubmitting}
              >
                Add another location
              </Button>
            </div>

            <div className="mt-4 flex justify-between gap-2">
              <Button
                variant="secondary"
                onClick={() => goToStep(1)}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => router.push("/dashboard")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmitStep2} disabled={isSubmitting}>
                  {isSubmitting ? "Saving locations..." : "Save & continue"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-text-primary">
              Step 3 — Facilities setup
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Create the initial facilities (courts, tables, zones, etc.) for
              this business. You can add more later from the sport-specific
              modules.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {step3Errors.global && (
              <div className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-500">
                {step3Errors.global}
              </div>
            )}

            <div className="space-y-6">
              {facilities.map((fac, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border-primary bg-surface-elevated/60 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-medium text-text-primary">
                      Facility {index + 1}
                    </div>
                    {facilities.length > 1 && (
                      <button
                        type="button"
                        className="text-xs text-red-500 hover:underline"
                        onClick={() => removeFacility(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Name *"
                      placeholder="e.g. Gaming Zone A, Court 1"
                      value={fac.name}
                      onChange={(e) =>
                        handleFacilityChange(index, "name", e.target.value)
                      }
                      error={
                        step3Errors.fields[`${index}.name`] ?? undefined
                      }
                    />
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-secondary">
                        Type *
                      </label>
                      <select
                        className="w-full rounded-md border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                        value={fac.type}
                        onChange={(e) =>
                          handleFacilityChange(index, "type", e.target.value)
                        }
                      >
                        <option value="gaming-pc">Gaming — PC</option>
                        <option value="vr">Gaming — VR</option>
                        <option value="ps5">Gaming — PS5</option>
                        <option value="ps4">Gaming — PS4</option>
                        <option value="xbox">Gaming — XBOX</option>
                        <option value="snooker-table">Snooker table</option>
                        <option value="table-tennis-table">
                          Table tennis table
                        </option>
                        <option value="futsal-field">Futsal field</option>
                        <option value="cricket-pitch">Cricket pitch</option>
                        <option value="padel-court">Padel court</option>
                        <option value="other">Other</option>
                      </select>
                      {step3Errors.fields[`${index}.type`] && (
                        <p className="mt-1 text-xs text-red-500">
                          {step3Errors.fields[`${index}.type`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-secondary">
                        Location *
                      </label>
                      <select
                        className="w-full rounded-md border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                        value={fac.location_id}
                        onChange={(e) =>
                          handleFacilityChange(
                            index,
                            "location_id",
                            e.target.value
                          )
                        }
                      >
                        <option value="">Select a location</option>
                        {locationOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {step3Errors.fields[`${index}.location_id`] && (
                        <p className="mt-1 text-xs text-red-500">
                          {step3Errors.fields[`${index}.location_id`]}
                        </p>
                      )}
                    </div>

                    <Input
                      label="Capacity"
                      type="number"
                      placeholder="Optional number of players/seats"
                      value={fac.capacity != null ? String(fac.capacity) : ""}
                      onChange={(e) =>
                        handleFacilityChange(index, "capacity", e.target.value)
                      }
                    />

                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-secondary">
                        Status
                      </label>
                      <select
                        className="w-full rounded-md border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                        value={fac.status}
                        onChange={(e) =>
                          handleFacilityChange(
                            index,
                            "status",
                            e.target.value
                          )
                        }
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <Button
                type="button"
                variant="secondary"
                onClick={addFacility}
                disabled={isSubmitting}
              >
                Add another facility
              </Button>
            </div>

            <div className="mt-4 flex justify-between gap-2">
              <Button
                variant="secondary"
                onClick={() => goToStep(2)}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => router.push("/dashboard")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmitStep3} disabled={isSubmitting}>
                  {isSubmitting ? "Saving facilities..." : "Finish onboarding"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

