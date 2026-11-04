const TOKEN_KEY = "surecap_admin_token";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

/** Session token first (current tab), then remembered localStorage token. */
export function getAdminToken(): string | null {
  if (!canUseStorage()) return null;
  return (
    window.sessionStorage.getItem(TOKEN_KEY) ??
    window.localStorage.getItem(TOKEN_KEY)
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
