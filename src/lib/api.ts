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
};

export type Application = {
  id: number;
  unit_id: number;
  status: string;
  created_at: string;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
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
