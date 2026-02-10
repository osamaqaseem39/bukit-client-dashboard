const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    let message = "Request failed";
    try {
      const data = await res.json();
      message = data.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    // No Content
    return undefined as T;
  }

  return res.json();
}

// Auth
export async function loginApi(email: string, password: string) {
  return apiFetch<{ access_token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerApi(data: {
  name: string;
  email: string;
  password: string;
}) {
  return apiFetch<{ id: string; email: string; name: string; role: string }>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export type DashboardModuleKey =
  | "dashboard-overview"
  | "gaming"
  | "snooker"
  | "table-tennis"
  | "cricket"
  | "futsal-turf"
  | "padel"
  | "locations"
  | "users"
  | "bookings"
  | "analytics"
  | "settings";

export interface AuthUserProfile {
  id: string;
  email: string;
  name: string;
  role: "admin" | "client" | "user";
  /**
   * Optional list of dashboard modules this user is allowed to see.
   *
   * If undefined or empty, the frontend will fall back to role-based
   * visibility rules.
   */
  modules?: DashboardModuleKey[] | null;
}

export async function getProfileApi() {
  return apiFetch<AuthUserProfile>("/auth/profile");
}

// Users (admin)
export interface AdminUserSummary {
  id: string;
  email: string;
  name: string;
  role: "admin" | "client" | "user";
  modules?: DashboardModuleKey[] | null;
}

export async function getUsersApi() {
  return apiFetch<AdminUserSummary[]>("/users");
}

export async function getUserByIdApi(id: string) {
  return apiFetch<AdminUserSummary>(`/users/${id}`);
}

export async function updateUserModulesApi(
  id: string,
  modules: DashboardModuleKey[] | null
) {
  return apiFetch<AdminUserSummary>(`/users/${id}/modules`, {
    method: "PATCH",
    body: JSON.stringify({ modules }),
  });
}

export async function uploadImageApi(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<{ url: string; filename: string; size: number }>(
    "/auth/upload",
    {
      method: "POST",
      body: formData,
    }
  );
}

// Bookings
export interface Booking {
  id: string;
  user_id: string;
  location_id: string;
  facility_id?: string | null;
  status: "pending" | "confirmed" | "cancelled";
  start_time: string;
  end_time: string;
  created_at?: string;
  updated_at?: string;
}

export async function getBookingsApi() {
  return apiFetch<Booking[]>("/bookings");
}

// Locations
export interface Location {
  id: string;
  client_id: string;
  name: string;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string;
  updated_at?: string;
}

export async function getLocationsApi(clientId?: string) {
  const query = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
  return apiFetch<Location[]>(`/locations${query}`);
}

// Gaming facilities
export type GamingStatus = "active" | "inactive" | "maintenance";

export interface GamingCenter {
  id: string;
  client_id: string;
  admin_id: string;
  name: string;
  description?: string | null;
  phone?: string | null;
  status: GamingStatus;
  logo_url?: string | null;
  cover_image_url?: string | null;
  amenities?: string[] | null;
  hourly_rate?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string;
  updated_at?: string;
}

export async function getGamingCentersApi(clientId?: string) {
  const query = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
  return apiFetch<GamingCenter[]>(`/gaming${query}`);
}

// Client statistics (admin overview)
export interface ClientStatistics {
  total: number;
  pending: number;
  approved: number;
  active: number;
  rejected: number;
  suspended: number;
}

export async function getClientStatisticsApi() {
  return apiFetch<ClientStatistics>("/clients/statistics");
}

// Clients (business onboarding)
export interface CreateClientUserPayload {
  name: string;
  email: string;
  password: string;
}

export interface CreateClientProfilePayload {
  company_name: string;
  legal_name?: string;
  contact_name: string;
  email: string;
  phone: string;
  address?: string;
  city: string;
  country: string;
  tax_id?: string;
  company_registration_number?: string;
  description?: string;
  logo_url?: string;
}

export interface CreateClientWithUserPayload {
  user: CreateClientUserPayload;
  client: CreateClientProfilePayload;
}

export async function createClientWithUserApi(
  payload: CreateClientWithUserPayload
) {
  // Uses the dedicated register-client endpoint which creates both user and client
  return apiFetch<any>("/auth/register-client", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface LocationPayload {
  id?: string;
  client_id?: string;
  name: string;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export async function createLocationApi(payload: LocationPayload) {
  return apiFetch<Location>("/locations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type FacilityStatus = "active" | "inactive" | "maintenance";

export interface FacilityPayload {
  id?: string;
  location_id: string;
  name: string;
  type: string;
  status: FacilityStatus;
  capacity?: number;
  metadata?: Record<string, any>;
}

export async function createFacilityApi(payload: FacilityPayload) {
  return apiFetch<any>("/facilities", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Facilities
export interface Facility {
  id: string;
  location_id: string;
  name: string;
  type: string;
  status: FacilityStatus;
  capacity?: number | null;
  metadata?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}

export interface GetFacilitiesParams {
  search?: string;
  type?: string;
  location_id?: string;
}

export async function getFacilitiesApi(params: GetFacilitiesParams = {}) {
  const query = new URLSearchParams();

  if (params.search) query.set("search", params.search);
  if (params.type) query.set("type", params.type);
  if (params.location_id) query.set("location_id", params.location_id);

  const qs = query.toString();
  const path = qs ? `/facilities?${qs}` : "/facilities";

  return apiFetch<Facility[]>(path);
}


