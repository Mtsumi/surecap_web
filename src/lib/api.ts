const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

export type Application = {
  id: number;
  unit_id: number;
  status: string;
  created_at: string;
};

type ApiEnvelope<T> = {
  status: "success" | "error";
  message: string;
  data: T | null;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
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

export function createApplication(unitId: number): Promise<Application> {
  return apiFetch<Application>("/applications", {
    method: "POST",
    body: JSON.stringify({ unit_id: unitId }),
  });
}
