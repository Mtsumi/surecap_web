const STORAGE_PREFIX = "surecap_apply_v1";

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

export function saveApplyProgress(progress: StoredApplyProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKey(progress.unitId),
      JSON.stringify({ ...progress, updatedAt: new Date().toISOString() })
    );
  } catch {
    // Quota or private mode — progress stays in memory for this session.
  }
}

export function clearApplyProgress(unitId: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(unitId));
  } catch {
    // ignore
  }
}
