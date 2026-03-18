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

  const contentType = res.headers.get("content-type") || "";

  // No content or non-JSON responses
  if (res.status === 204 || !contentType.toLowerCase().includes("application/json")) {
    return undefined as T;
  }

  return res.json();
}

// Auth
export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  requires_password_change?: boolean;
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
  | "arena"
  | "locations"
  | "users"
  | "bookings"
  | "analytics"
  | "settings";

/** Single source of truth for dashboard module labels (used in Settings and Users). */
export const DASHBOARD_MODULES: { key: DashboardModuleKey; label: string }[] = [
  { key: "dashboard-overview", label: "Dashboard overview" },
  { key: "gaming", label: "Gaming" },
  { key: "snooker", label: "Snooker" },
  { key: "table-tennis", label: "Table tennis" },
  { key: "arena", label: "Arena" },
  { key: "locations", label: "Locations" },
  { key: "users", label: "Users" },
  { key: "bookings", label: "Bookings" },
  { key: "analytics", label: "Analytics" },
  { key: "settings", label: "Settings" },
];

export interface AuthUserProfile {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin" | "client" | "user" | "location_manager";
  /**
   * Optional client_id for users that belong to a client admin's domain.
   */
  client_id?: string | null;
  /**
   * When role is location_manager, the single location this user manages (belongs to client).
   */
  managed_location_id?: string | null;
  /**
   * Optional list of dashboard modules this user is allowed to see.
   *
   * If undefined or empty, the frontend will fall back to role-based
   * visibility rules.
   */
  modules?: DashboardModuleKey[] | null;
  /** When true, user must change password before using the dashboard. */
  requires_password_change?: boolean;
}

export async function getProfileApi() {
  return apiFetch<AuthUserProfile>("/auth/profile");
}

export async function changePasswordApi(current_password: string, new_password: string) {
  return apiFetch<{ success: boolean }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password, new_password }),
  });
}

// Users (admin)
export interface AdminUserSummary {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin" | "client" | "user" | "location_manager";
  client_id?: string | null;
  managed_location_id?: string | null;
  modules?: DashboardModuleKey[] | null;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role?: "super_admin" | "admin" | "client" | "user" | "location_manager";
  /** Required when role is location_manager: ID of the location this user will manage. */
  managed_location_id?: string | null;
}

export interface UpdateUserRolePayload {
  role?: "super_admin" | "admin" | "client" | "user" | "location_manager";
  modules?: DashboardModuleKey[] | null;
  /** When role is location_manager, the location this user manages. Set null to clear. */
  managed_location_id?: string | null;
}

export async function getUsersApi() {
  return apiFetch<AdminUserSummary[]>("/users");
}

export async function getUserByIdApi(id: string) {
  return apiFetch<AdminUserSummary>(`/users/${id}`);
}

export async function createUserApi(payload: CreateUserPayload) {
  return apiFetch<AdminUserSummary>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
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

export async function updateUserRoleApi(
  id: string,
  payload: UpdateUserRolePayload
) {
  return apiFetch<AdminUserSummary>(`/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateUserPasswordApi(id: string, password: string) {
  return apiFetch<AdminUserSummary>(`/users/${id}/password`, {
    method: "PATCH",
    body: JSON.stringify({ password }),
  });
}

const IMAGE_UPLOAD_URL =
  process.env.NEXT_PUBLIC_IMAGE_UPLOAD_URL || "";

export interface UploadImageResult {
  url: string;
  filename?: string;
  size?: number;
}

/** Upload image via PHP endpoint (if NEXT_PUBLIC_IMAGE_UPLOAD_URL set) or backend /auth/upload */
export async function uploadImageApi(file: File): Promise<UploadImageResult> {
  const formData = new FormData();
  formData.append("file", file);

  if (IMAGE_UPLOAD_URL) {
    const res = await fetch(IMAGE_UPLOAD_URL, {
      method: "POST",
      body: formData,
      credentials: "omit",
    });
    const json = await res.json();
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || "Image upload failed");
    }
    const data = json.data;
    return {
      url: data?.url ?? "",
      filename: data?.filename,
      size: data?.size,
    };
  }

  const result = await apiFetch<{ url: string; filename: string; size: number }>(
    "/auth/upload",
    {
      method: "POST",
      body: formData,
    }
  );
  return result;
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
  // Optional extended fields (walk-ins, ledger)
  is_walk_in?: boolean;
  guest_name?: string | null;
  guest_phone?: string | null;
  amount?: number | null;
  currency?: string | null;
  checked_in_at?: string | null;
  check_in_status?: string | null;
}

export async function getBookingsApi() {
  return apiFetch<Booking[]>("/bookings");
}

export interface CreateBookingPayload {
  location_id: string;
  facility_id?: string;
  start_time: string | Date;
  end_time: string | Date;
  status?: "pending" | "confirmed" | "cancelled";
  is_walk_in?: boolean;
  guest_name?: string;
  guest_phone?: string;
  amount?: number;
  currency?: string;
}

export async function createBookingApi(payload: CreateBookingPayload) {
  return apiFetch<Booking>("/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface LedgerQueryParams {
  date?: string;
  location_id?: string;
  facility_id?: string;
}

export async function getDailyLedgerApi(params: LedgerQueryParams = {}) {
  const query = new URLSearchParams();
  if (params.date) query.set("date", params.date);
  if (params.location_id) query.set("location_id", params.location_id);
  if (params.facility_id) query.set("facility_id", params.facility_id);
  const qs = query.toString();
  const path = qs ? `/ledger/daily?${qs}` : "/ledger/daily";
  return apiFetch<Booking[]>(path);
}

export interface BookingsReportRow {
  date: string;
  total_bookings: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  walk_ins: number;
  revenue: number | null;
}

export interface BookingsReportQuery {
  from?: string;
  to?: string;
  location_id?: string;
  facility_id?: string;
}

export async function getBookingsReportApi(
  params: BookingsReportQuery = {}
): Promise<BookingsReportRow[]> {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.location_id) query.set("location_id", params.location_id);
  if (params.facility_id) query.set("facility_id", params.facility_id);
  const qs = query.toString();
  const path = qs ? `/reports/bookings?${qs}` : "/reports/bookings";
  return apiFetch<BookingsReportRow[]>(path);
}

export async function checkInBookingApi(id: string) {
  return apiFetch<Booking>(`/bookings/${id}/check-in`, {
    method: "PATCH",
  });
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
  facility_types?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

export async function getLocationsApi(clientId?: string) {
  const query = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
  return apiFetch<Location[]>(`/locations${query}`);
}

export interface LocationCityDto {
  name: string;
  state?: string | null;
  country?: string | null;
  locations_count?: number;
}

export async function getLocationCitiesApi() {
  return apiFetch<LocationCityDto[]>(`/locations/cities`);
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
  state?: string | null;
  city?: string | null;
  country?: string | null;
  status: "pending" | "approved" | "rejected" | "suspended" | "active";
  logo_url?: string | null;
  locations_count?: number;
  facilities_count?: number;
}

export interface ClientDetail extends ClientSummary {
  address?: string | null;
  state?: string | null;
  postal_code?: string | null;
  tax_id?: string | null;
  company_registration_number?: string | null;
  description?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  commission_rate?: number | null;
  /**
   * Optional latitude/longitude for the client's primary location.
   * These may come back as numbers or strings from the API.
   */
  latitude?: number | string | null;
  longitude?: number | string | null;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export async function getClientsApi() {
  return apiFetch<ClientSummary[]>("/clients");
}

export async function getClientByIdApi(id: string) {
  return apiFetch<ClientDetail>(`/clients/${id}`);
}

export async function getClientByUserIdApi(userId: string) {
  return apiFetch<ClientDetail>(`/clients/user/${userId}`);
}

export interface UpdateClientPayload {
  company_name?: string | null;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  tax_id?: string | null;
  company_registration_number?: string | null;
  description?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  /**
   * Optional latitude/longitude for the client's primary location.
   * These mirror the fields on ClientDetail and are forwarded to the backend.
   */
  latitude?: number | string | null;
  longitude?: number | string | null;
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
  contact_name: string;
  email: string;
  phone: string;
  address?: string;
  city: string;
  state?: string;
  country: string;
  postal_code?: string;
  tax_id?: string;
  company_registration_number?: string;
  description?: string;
  logo_url?: string;
  cover_image_url?: string;
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
  facility_types?: string[] | null;
}

export async function createLocationApi(payload: LocationPayload) {
  return apiFetch<Location>("/locations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateLocationApi(id: string, payload: LocationPayload) {
  return apiFetch<Location>(`/locations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteLocationApi(id: string) {
  return apiFetch<void>(`/locations/${id}`, {
    method: "DELETE",
  });
}

export interface FacilityTypeDto {
  type: string;
  locations_count?: number;
  facilities_count?: number;
}

export async function getFacilityTypesApi() {
  return apiFetch<FacilityTypeDto[]>(`/facilities/types`);
}

export type FacilityStatus = "active" | "inactive" | "maintenance";

export interface LocationAvailabilitySearchDto {
  /** Optional: filter by city (uses Location.city) */
  city?: string;
  /** Optional: filter by facility type (uses Facility.type) */
  facility_type?: string;
  /** ISO datetime for desired start time */
  start_time: string;
  /** ISO datetime for desired end time */
  end_time: string;
}

export interface AvailableLocationDto {
  location: Location;
  /** Facilities at this location that match type & are free in the time window */
  available_facilities: Facility[];
}

export async function searchAvailableLocationsApi(
  params: LocationAvailabilitySearchDto
) {
  const query = new URLSearchParams();
  if (params.city) query.set("city", params.city);
  if (params.facility_type) query.set("facility_type", params.facility_type);
  query.set("start_time", params.start_time);
  query.set("end_time", params.end_time);
  const qs = query.toString();
  const path = qs ? `/search/availability?${qs}` : `/search/availability`;
  return apiFetch<AvailableLocationDto[]>(path);
}

/** Payload for creating a facility at a location (location is in the URL). */
export interface CreateFacilityPayload {
  name: string;
  type: string;
  status: FacilityStatus;
  capacity?: number;
  metadata?: Record<string, any>;
}

/** Payload for create when using legacy flat API (prefer location-scoped). */
export interface FacilityPayload extends CreateFacilityPayload {
  id?: string;
  location_id: string;
}

// Facilities (location-scoped: backend uses /locations/:locationId/facilities)
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

export async function getFacilitiesByLocationApi(locationId: string) {
  return apiFetch<Facility[]>(`/locations/${locationId}/facilities`);
}

export async function createFacilityAtLocationApi(
  locationId: string,
  payload: CreateFacilityPayload
) {
  return apiFetch<Facility>(`/locations/${locationId}/facilities`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFacilityAtLocationApi(
  locationId: string,
  facilityId: string,
  payload: Partial<CreateFacilityPayload>
) {
  return apiFetch<Facility>(
    `/locations/${locationId}/facilities/${facilityId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteFacilityAtLocationApi(
  locationId: string,
  facilityId: string
) {
  return apiFetch<void>(
    `/locations/${locationId}/facilities/${facilityId}`,
    { method: "DELETE" }
  );
}


