const TOKEN_KEY = "surecap_admin_token";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

/** Client-side exp check only (server still verifies the signature). */
function tokenStillValid(token: string): boolean {
  try {
    const part = token.split(".")[1];
    if (!part) return false;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { exp?: number };
    if (typeof payload.exp !== "number") return true;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function readStorage(storage: Storage): string | null {
  const token = storage.getItem(TOKEN_KEY);
  if (!token) return null;
  if (tokenStillValid(token)) return token;
  storage.removeItem(TOKEN_KEY);
  return null;
}

/** Prefer a still-valid session token, else a remembered localStorage token. */
export function getAdminToken(): string | null {
  if (!canUseStorage()) return null;
  return (
    readStorage(window.sessionStorage) ?? readStorage(window.localStorage)
  );
}

/** remember=true → localStorage (survives browser restart); else sessionStorage. */
export function setAdminToken(token: string, remember = false): void {
  if (!canUseStorage()) return;
  if (remember) {
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearAdminToken(): void {
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
}

export function isAdminLoggedIn(): boolean {
  return Boolean(getAdminToken());
}
