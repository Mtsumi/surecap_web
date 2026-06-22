import { clearAdminToken, getAdminToken } from "./adminAuth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type ApiEnvelope<T> = {
  status: "success" | "error";
  message: string;
  data: T | null;
};

export type AdminUser = {
  id: number;
  email: string;
  is_super_admin: boolean;
  active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminLoginResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  must_change_password: boolean;
};

export type ApplicationListItem = {
  id: number;
  status: string;
  given_name: string | null;
  family_name: string | null;
  email: string | null;
  applicant_name?: string | null;
  unit_id: number;
  unit_number: string;
  building_id: number;
  building_name: string;
  created_at: string;
};

export type ApplicationMember = {
  id: number;
  application_id: number;
  role: string;
  member_status: string;
  invited_name: string | null;
  invited_email: string | null;
  given_name: string | null;
  family_name: string | null;
  email: string | null;
  phone: string | null;
};

export type ApplicationDetail = {
  id: number;
  unit_id: number;
  status: string;
  given_name: string | null;
  family_name: string | null;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  current_address: string | null;
  previous_address: string | null;
  lease_in_name: boolean | null;
  move_in_date: string | null;
  renting_with_others: boolean | null;
  landlord_email: string | null;
  hr_email: string | null;
  referral_source: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  unit_number: string;
  civic_number: string | null;
  building_id: number;
  building_name: string;
  building_address: string;
  members?: ApplicationMember[];
  roommate_count?: number;
  has_guarantor?: boolean;
};

export type ApplicationList = {
  items: ApplicationListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type ApplicationJob = {
  id: number;
  application_id: number | null;
  application_member_id: number;
  job_type: string;
  status: string;
  message: string | null;
  created_at: string;
  updated_at: string;
};

export type BuildingAdmin = {
  id: number;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
};

export type UnitAdmin = {
  id: number;
  building_id: number;
  unit_number: string;
  civic_number: string | null;
  for_rent: boolean;
  rent: number | null;
  available_date: string | null;
  active: boolean;
};

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const token = getAdminToken();
  if (token) h.Authorization = `Bearer ${token}`;
  if (API_URL.includes("ngrok")) h["ngrok-skip-browser-warning"] = "1";
  return h;
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers as Record<string, string>) },
  });

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    body = null;
  }

  if (res.status === 401) {
    const message = body?.message || "Unauthorized";
    // Expired/invalid JWT on protected routes; credential errors use specific messages.
    if (message === "Unauthorized") {
      clearAdminToken();
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/admin/login";
      }
      throw new Error("Session expired");
    }
    throw new Error(message);
  }

  if (!res.ok || body?.status === "error") {
    throw new Error(body?.message || res.statusText);
  }

  if (!body || body.data === null || body.data === undefined) {
    throw new Error(body?.message || "Empty response");
  }

  return body.data;
}

async function adminPublicPost(path: string, payload: object): Promise<string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (API_URL.includes("ngrok")) h["ngrok-skip-browser-warning"] = "1";

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: h,
    body: JSON.stringify(payload),
  });

  let body: ApiEnvelope<null> | null = null;
  try {
    body = (await res.json()) as ApiEnvelope<null>;
  } catch {
    body = null;
  }

  if (!res.ok || body?.status === "error") {
    throw new Error(body?.message || res.statusText);
  }

  return body?.message || "Success";
}

export function adminLogin(email: string, password: string) {
  return adminFetch<AdminLoginResponse>("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function adminMe() {
  return adminFetch<AdminUser>("/admin/auth/me");
}

export function changeAdminPassword(current_password: string, new_password: string) {
  return adminFetch<AdminUser>("/admin/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password, new_password }),
  });
}

export function requestPasswordReset(email: string) {
  return adminPublicPost("/admin/auth/forgot-password", { email });
}

export function resetPassword(token: string, new_password: string) {
  return adminPublicPost("/admin/auth/reset-password", { token, new_password });
}

export function listApplications(params?: {
  status?: string;
  building_id?: number;
  limit?: number;
  offset?: number;
}) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.building_id) q.set("building_id", String(params.building_id));
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));
  const qs = q.toString();
  return adminFetch<ApplicationList>(`/admin/applications${qs ? `?${qs}` : ""}`);
}

export function getApplication(id: number) {
  return adminFetch<ApplicationDetail>(`/admin/applications/${id}`);
}

export function getApplicationJobs(id: number) {
  return adminFetch<ApplicationJob[]>(`/admin/applications/${id}/jobs`);
}

export function acceptApplication(id: number) {
  return adminFetch<ApplicationDetail>(`/admin/applications/${id}/accept`, {
    method: "POST",
  });
}

export function rejectApplication(id: number, reason: string) {
  return adminFetch<ApplicationDetail>(`/admin/applications/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function listBuildingsAdmin() {
  return adminFetch<BuildingAdmin[]>("/admin/buildings");
}

export function listUnitsAdmin(buildingId: number) {
  return adminFetch<UnitAdmin[]>(`/admin/buildings/${buildingId}/units`);
}

export function updateUnitAdmin(
  unitId: number,
  data: Partial<Pick<UnitAdmin, "for_rent" | "rent" | "available_date" | "active">>
) {
  return adminFetch<UnitAdmin>(`/admin/units/${unitId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function listAdminUsers() {
  return adminFetch<AdminUser[]>("/admin/users");
}

export function createAdminUser(data: {
  email: string;
  password: string;
  is_super_admin?: boolean;
}) {
  return adminFetch<AdminUser>("/admin/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateAdminUser(
  id: number,
  data: Partial<{ active: boolean; password: string; is_super_admin: boolean }>
) {
  return adminFetch<AdminUser>(`/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
