const STORAGE_PREFIX = "surecap_apply_v1";
const LATEST_KEY = `${STORAGE_PREFIX}:latest`;

export type DraftSession = {
  applicationId: number;
  memberId: number;
  uploadToken: string;
};

export type StoredApplyProgress = {
  unitId: number;
  buildingId: number;
  step: string;
  form: Record<string, unknown>;
  roommates: { name: string; email: string }[];
  includeGuarantor: boolean;
  guarantor: { name: string; email: string; phone: string };
  draftSession?: DraftSession | null;
  idKind?: "driver_licence" | "medicare" | "passport";
  updatedAt: string;
};

function storageKey(unitId: number): string {
  return `${STORAGE_PREFIX}:${unitId}`;
}

export function loadApplyProgress(unitId: number): StoredApplyProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(unitId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredApplyProgress;
    if (parsed.unitId !== unitId) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Most recently saved draft on this device (any unit). */
export function loadLatestApplyProgress(): StoredApplyProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LATEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredApplyProgress;
    if (!parsed.unitId || !parsed.buildingId) return null;
    // Prefer the per-unit copy if present (more authoritative).
    return loadApplyProgress(parsed.unitId) ?? parsed;
  } catch {
    return null;
  }
}

export function saveApplyProgress(progress: StoredApplyProgress): void {
  if (typeof window === "undefined") return;
  try {
    const payload = { ...progress, updatedAt: new Date().toISOString() };
    window.localStorage.setItem(storageKey(progress.unitId), JSON.stringify(payload));
    window.localStorage.setItem(LATEST_KEY, JSON.stringify(payload));
  } catch {
    // Quota or private mode — progress stays in memory for this session.
  }
}

export function clearApplyProgress(unitId: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(unitId));
    const latest = window.localStorage.getItem(LATEST_KEY);
    if (latest) {
      try {
        const parsed = JSON.parse(latest) as StoredApplyProgress;
        if (parsed.unitId === unitId) {
          window.localStorage.removeItem(LATEST_KEY);
        }
      } catch {
        window.localStorage.removeItem(LATEST_KEY);
      }
    }
  } catch {
    // ignore
  }
}
