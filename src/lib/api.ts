const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Building = {
  id: number;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

export type Unit = {
  id: number;
  building_id: number;
  unit_number: string;
  civic_number: string | null;
  rent: number | null;
  available_date: string | null;
};

export type LocaleCode = "fr" | "en";

export type Application = {
  id: number;
  unit_id: number;
  status: string;
  preferred_locale: LocaleCode;
  given_name: string | null;
  family_name: string | null;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  current_address: string | null;
  current_place_id: string | null;
  previous_address: string | null;
  previous_place_id: string | null;
  lease_in_name: boolean | null;
  move_in_date: string | null;
  renting_with_others: boolean | null;
  co_tenant_names: string | null;
  landlord_email: string | null;
  hr_email: string | null;
  referral_source: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationUpdate = Partial<{
  preferred_locale: LocaleCode;
  given_name: string;
  family_name: string;
  date_of_birth: string;
  email: string;
  phone: string;
  current_address: string;
  current_place_id: string;
  previous_address: string;
  previous_place_id: string;
  lease_in_name: boolean;
  move_in_date: string;
  renting_with_others: boolean;
  co_tenant_names: string;
  landlord_email: string;
  hr_email: string;
  referral_source: string;
  facebook_url: string;
  linkedin_url: string;
}>;

type ApiEnvelope<T> = {
  status: "success" | "error";
  message: string;
  data: T | null;
};

function apiHeaders(init?: RequestInit): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (API_URL.includes("ngrok")) {
    headers["ngrok-skip-browser-warning"] = "1";
  }
  return headers;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: apiHeaders(init),
  });

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    body = null;
  }

  if (!res.ok || body?.status === "error") {
    throw new Error(body?.message || res.statusText);
  }

  if (!body || body.data === null || body.data === undefined) {
    throw new Error(body?.message || "Empty API response");
  }

  return body.data;
}

export function fetchBuildings(): Promise<Building[]> {
  return apiFetch<Building[]>("/buildings");
}

export function fetchUnits(buildingId: number): Promise<Unit[]> {
  return apiFetch<Unit[]>(`/buildings/${buildingId}/units`);
}

export function createApplicationDraft(unitId: number): Promise<Application> {
  return apiFetch<Application>("/applications", {
    method: "POST",
    body: JSON.stringify({ unit_id: unitId }),
  });
}

export function updateApplication(
  id: number,
  payload: ApplicationUpdate
): Promise<Application> {
  return apiFetch<Application>(`/applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getApplication(id: number): Promise<Application> {
  return apiFetch<Application>(`/applications/${id}`);
}

export function submitApplication(id: number): Promise<Application> {
  return apiFetch<Application>(`/applications/${id}/submit`, {
    method: "POST",
  });
}
