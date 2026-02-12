"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  createClientWithUserApi,
  createLocationApi,
  getClientByIdApi,
  getLocationsApi,
  updateClientApi,
  type ClientDetail,
  type LocationPayload,
  type UpdateClientPayload,
} from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";

type WizardStep = 1 | 2;

interface StepErrorState {
  global?: string | null;
  fields: Record<string, string | null>;
}

const initialErrorState: StepErrorState = {
  global: null,
  fields: {},
};

export default function DashboardSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientIdFromQuery = searchParams.get("clientId");

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Step 1: Business information
  const [businessForm, setBusinessForm] = useState({
    companyName: "",
    legalName: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    taxId: "",
    registrationNumber: "",
    description: "",
    logoUrl: "",
    coverImageUrl: "",
    latitude: "",
    longitude: "",
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

  // Prefill when editing an existing business
  useEffect(() => {
    if (!clientIdFromQuery) return;

    const id = clientIdFromQuery as string;

    setIsEditing(true);
    setIsLoadingExisting(true);
    setLoadError(null);

    async function loadExisting() {
      try {
        const client: ClientDetail = await getClientByIdApi(id);
        const clientLocations = await getLocationsApi(id);

        setClientId(client.id);

        setBusinessForm((prev) => ({
          ...prev,
          companyName: client.company_name || "",
          legalName: (client as any).legal_name || "",
          contactName: client.contact_name || client.user?.name || "",
          email: client.email || client.user?.email || "",
          phone: client.phone || "",
          address: client.address || "",
          city: client.city || "",
          state: client.state || "",
          country: client.country || "",
          postalCode: client.postal_code || "",
          taxId: client.tax_id || "",
          registrationNumber: client.company_registration_number || "",
          description: client.description || "",
          logoUrl: client.logo_url || "",
          coverImageUrl: client.cover_image_url || "",
          latitude: client.latitude != null ? String(client.latitude) : "",
          longitude: client.longitude != null ? String(client.longitude) : "",
          adminPassword: "",
        }));

        if (clientLocations && clientLocations.length > 0) {
          const mapped: LocationPayload[] = clientLocations.map((loc) => ({
            id: loc.id,
            client_id: loc.client_id,
            name: loc.name,
            description: loc.description ?? undefined,
            phone: loc.phone ?? undefined,
            address: loc.address ?? undefined,
            city: loc.city ?? undefined,
            state: loc.state ?? undefined,
            country: loc.country ?? undefined,
            postal_code: loc.postal_code ?? undefined,
            latitude: loc.latitude ?? undefined,
            longitude: loc.longitude ?? undefined,
          }));
          setLocations(mapped);
        }
      } catch (err: any) {
        setLoadError(err.message || "Failed to load existing business data");
      } finally {
        setIsLoadingExisting(false);
      }
    }

    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientIdFromQuery]);

  function goToStep(step: WizardStep) {
    // When editing, prevent navigation to step 2 if business hasn't been saved yet
    if (isEditing && step === 2 && !clientId) {
      setStep1Errors({
        global: "Please save the business information first before proceeding to locations.",
        fields: {},
      });
      return;
    }
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
                    : (() => {
                        const num = Number(value);
                        if (isNaN(num)) return undefined;
                        // Validate ranges
                        if (field === "latitude" && (num < -90 || num > 90)) {
                          return undefined; // Invalid, but let validation catch it
                        }
                        if (field === "longitude" && (num < -180 || num > 180)) {
                          return undefined; // Invalid, but let validation catch it
                        }
                        return num;
                      })()
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
    if (locations.length > 1) {
      setLocations((prev) => prev.filter((_, i) => i !== index));
    }
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
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessForm.email)) {
      errors.fields.email = "Please enter a valid email address";
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
    if (businessForm.latitude && businessForm.latitude.trim()) {
      const lat = Number(businessForm.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.fields.latitude = "Latitude must be between -90 and 90";
      }
    }
    if (businessForm.longitude && businessForm.longitude.trim()) {
      const lng = Number(businessForm.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.fields.longitude = "Longitude must be between -180 and 180";
      }
    }
    if (!isEditing) {
      if (!businessForm.adminPassword.trim()) {
        errors.fields.adminPassword = "Admin password is required";
      } else if (businessForm.adminPassword.trim().length < 6) {
        errors.fields.adminPassword = "Password must be at least 6 characters";
      }
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
      if (loc.latitude != null && (loc.latitude < -90 || loc.latitude > 90)) {
        errors.fields[`${index}.latitude`] = "Latitude must be between -90 and 90";
      }
      if (loc.longitude != null && (loc.longitude < -180 || loc.longitude > 180)) {
        errors.fields[`${index}.longitude`] = "Longitude must be between -180 and 180";
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

  async function handleSubmitStep1() {
    if (!validateStep1()) return;

    setIsSubmitting(true);
    try {
      if (isEditing && clientIdFromQuery) {
        const payload: UpdateClientPayload = {
          company_name: businessForm.companyName,
          legal_name: businessForm.legalName || null,
          contact_name: businessForm.contactName || null,
          email: businessForm.email || null,
          phone: businessForm.phone || null,
          address: businessForm.address || null,
          city: businessForm.city || null,
          state: businessForm.state || null,
          country: businessForm.country || null,
          postal_code: businessForm.postalCode || null,
          tax_id: businessForm.taxId || null,
          company_registration_number:
            businessForm.registrationNumber || null,
          description: businessForm.description || null,
          logo_url: businessForm.logoUrl || null,
          cover_image_url: businessForm.coverImageUrl || null,
          latitude: businessForm.latitude ? Number(businessForm.latitude) : null,
          longitude: businessForm.longitude ? Number(businessForm.longitude) : null,
        };

        await updateClientApi(clientIdFromQuery, payload);
        setClientId(clientIdFromQuery);
        setCurrentStep(2);
      } else {
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
            state: businessForm.state || undefined,
            country: businessForm.country,
            postal_code: businessForm.postalCode || undefined,
            tax_id: businessForm.taxId || undefined,
            company_registration_number:
              businessForm.registrationNumber || undefined,
            description: businessForm.description || undefined,
            logo_url: businessForm.logoUrl || undefined,
            cover_image_url: businessForm.coverImageUrl || undefined,
            latitude: businessForm.latitude ? Number(businessForm.latitude) : undefined,
            longitude: businessForm.longitude ? Number(businessForm.longitude) : undefined,
          },
        };

        const result = await createClientWithUserApi(payload);

        // Use user.id instead of client.id because locations.client_id references users.id
        const createdClientId =
          (result as any)?.user?.id ||
          (result as any)?.client?.id ||
          (result as any)?.client_id ||
          (result as any)?.id;

        if (!createdClientId) {
          throw new Error("Client ID missing from response");
        }

        setClientId(createdClientId);
        setCurrentStep(2);
      }
    } catch (err: any) {
      setStep1Errors({
        global:
          err.message ||
          (isEditing ? "Failed to update business" : "Failed to create business"),
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
          "Business has not been created yet. Please complete Step 1 first.",
        fields: {},
      });
      setCurrentStep(1);
      return;
    }

    if (!validateStep2()) return;

    setIsSubmitting(true);
    try {
      for (const loc of locations) {
        // When editing, don't recreate existing locations (those with an id)
        if (loc.id) continue;

        const payload: LocationPayload = {
          ...loc,
          client_id: clientId,
        };
        await createLocationApi(payload);
      }

      // On success, redirect to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setStep2Errors({
        global: err.message || "Failed to save locations",
        fields: {},
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          {isEditing ? "Edit Business" : "Add New Dashboard"}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Step {currentStep} of 2 — Set up business information and locations.
        </p>
        {isLoadingExisting && (
          <p className="mt-1 text-sm text-text-secondary">
            Loading existing business data...
          </p>
        )}
        {loadError && (
          <p className="mt-1 text-sm text-error">{loadError}</p>
        )}
      </div>

      {/* Stepper */}
      <div className="grid gap-4 md:grid-cols-2">
        {[
          { step: 1, label: "Business Information" },
          { step: 2, label: "Locations" },
        ].map((item) => {
          const isActive = currentStep === item.step;
          const isCompleted = currentStep > (item.step as number);
          // When editing, disable step 2 if business hasn't been saved
          const isDisabled = isEditing && item.step === 2 && !clientId;
          return (
            <div
              key={item.step}
              className={`rounded-lg border px-4 py-3 text-sm ${
                isActive
                  ? "border-primary bg-primary/5 text-primary"
                  : isCompleted
                  ? "border-success bg-success/5 text-success"
                  : isDisabled
                  ? "border-border bg-surface-elevated/30 text-text-tertiary cursor-not-allowed opacity-50"
                  : "border-border bg-surface-elevated/60 text-text-secondary cursor-pointer hover:bg-surface-elevated"
              }`}
              onClick={() => {
                if (!isDisabled) {
                  goToStep(item.step as WizardStep);
                }
              }}
            >
              <div className="font-medium">
                Step {item.step}: {item.label}
              </div>
              <div className="text-xs">
                {item.step === 1 &&
                  "Enter business profile and primary contact details."}
                {item.step === 2 &&
                  (isDisabled
                    ? "Save business information first to proceed."
                    : "Add one or more branch locations for this business.")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Business Information */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-text-primary">
              Step 1 — Business Information
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Enter the business profile and primary contact details.
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
              {!isEditing && (
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
              )}
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
                label="State / Region"
                placeholder="State or province"
                value={businessForm.state}
                onChange={(e) =>
                  handleBusinessChange("state", e.target.value)
                }
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
                label="Postal code"
                placeholder="ZIP or postal code"
                value={businessForm.postalCode}
                onChange={(e) =>
                  handleBusinessChange("postalCode", e.target.value)
                }
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
              <Input
                label="Cover image URL"
                placeholder="https://..."
                value={businessForm.coverImageUrl}
                onChange={(e) =>
                  handleBusinessChange("coverImageUrl", e.target.value)
                }
              />
              <Input
                label="Latitude"
                placeholder="Between -90 and 90"
                type="number"
                step="any"
                min="-90"
                max="90"
                value={businessForm.latitude}
                onChange={(e) =>
                  handleBusinessChange("latitude", e.target.value)
                }
                error={step1Errors.fields.latitude ?? undefined}
              />
              <Input
                label="Longitude"
                placeholder="Between -180 and 180"
                type="number"
                step="any"
                min="-180"
                max="180"
                value={businessForm.longitude}
                onChange={(e) =>
                  handleBusinessChange("longitude", e.target.value)
                }
                error={step1Errors.fields.longitude ?? undefined}
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
                {isSubmitting
                  ? isEditing
                    ? "Saving changes..."
                    : "Creating business..."
                  : "Save & continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Locations */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-text-primary">
              Step 2 — Locations
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Add one or more branch locations for this business. You can add
              multiple branches if your business operates in different
              locations.
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
                      Branch {index + 1}
                    </div>
                    {locations.length > 1 && (
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs text-red-500 hover:underline"
                        onClick={() => removeLocation(index)}
                      >
                        <Trash2 className="h-3 w-3" />
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
                      placeholder="Between -90 and 90"
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      value={
                        typeof loc.latitude === "number"
                          ? String(loc.latitude)
                          : ""
                      }
                      onChange={(e) =>
                        handleLocationChange(index, "latitude", e.target.value)
                      }
                      error={
                        step2Errors.fields[`${index}.latitude`] ?? undefined
                      }
                    />
                    <Input
                      label="Longitude"
                      placeholder="Between -180 and 180"
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
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
                      error={
                        step2Errors.fields[`${index}.longitude`] ?? undefined
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
                <Plus className="mr-2 h-4 w-4" />
                Add another branch
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
                  {isSubmitting
                    ? "Saving locations..."
                    : "Complete Setup"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
