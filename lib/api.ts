const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

const ACCESS_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refresh_token";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAuthTokens(params: {
  accessToken: string;
  refreshToken?: string;
}) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, params.accessToken);
  if (params.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, params.refreshToken);
  }
}

export function clearAuthTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const attachAuthHeader = () => {
    const currentToken = getAccessToken();
    if (currentToken) {
      headers["Authorization"] = `Bearer ${currentToken}`;
    } else {
      delete headers["Authorization"];
    }
  };

  const doRequest = async () => {
    attachAuthHeader();
    return fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  };

  let res = await doRequest();

  // Try refresh on unauthorized (e.g., expired access token)
  if (
    res.status === 401 &&
    path !== "/auth/login" &&
    path !== "/auth/refresh"
  ) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
          credentials: "include",
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          if (data?.access_token) {
            setAuthTokens({
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
            });
            res = await doRequest();
          }
        } else {
          clearAuthTokens();
        }
      } catch {
        clearAuthTokens();
      }
    }
  }

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
export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
}

export async function loginApi(email: string, password: string) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logoutApi(refreshToken?: string | null) {
  const body: Record<string, string> = {};
  const token = refreshToken ?? getRefreshToken();
  if (token) {
    body.refresh_token = token;
  }

  return apiFetch<void>("/auth/logout", {
    method: "POST",
    body: Object.keys(body).length ? JSON.stringify(body) : undefined,
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

// Clients list/detail
export interface ClientSummary {
  id: string;
  user_id: string;
  company_name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  status: "pending" | "approved" | "rejected" | "suspended" | "active";
  logo_url?: string | null;
  locations_count?: number;
  facilities_count?: number;
}

export async function getClientsApi() {
  return apiFetch<ClientSummary[]>("/clients");
}

export interface UpdateClientPayload {
  company_name?: string;
  legal_name?: string | null;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  tax_id?: string | null;
  company_registration_number?: string | null;
  description?: string | null;
  logo_url?: string | null;
}

export async function updateClientApi(id: string, payload: UpdateClientPayload) {
  return apiFetch<ClientSummary>(`/clients/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// Client status actions (admin)
export async function approveClientApi(id: string) {
  return apiFetch<ClientSummary>(`/clients/${id}/approve`, {
    method: "POST",
  });
}

export async function rejectClientApi(id: string, reason: string) {
  return apiFetch<ClientSummary>(`/clients/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function suspendClientApi(id: string, reason: string) {
  return apiFetch<ClientSummary>(`/clients/${id}/suspend`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function activateClientApi(id: string) {
  return apiFetch<ClientSummary>(`/clients/${id}/activate`, {
    method: "POST",
  });
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


