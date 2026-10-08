/** Admin UI: map fetch/API failures to short FR/EN copy (never "Failed to fetch"). */

import type { Locale } from "./i18n";

const NETWORK_RE =
  /failed to fetch|load failed|networkerror|network request failed|fetch failed|err_network|econnrefused|enotfound/i;

const SESSION_RE = /session expired|unauthorized|not authenticated/i;

const GENERIC_TECH_RE =
  /internal server error|bad gateway|service unavailable|gateway timeout|empty response|status text|econnreset/i;

export function isAdminNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (
    error.name === "AdminNetworkError" ||
    error.name === "ClientNetworkError"
  ) {
    return true;
  }
  if (error.message === "ADMIN_NETWORK" || error.message === "CLIENT_NETWORK") {
    return true;
  }
  return NETWORK_RE.test(error.message);
}

export function formatAdminFetchError(
  error: unknown,
  locale: Locale = "fr",
  fallback?: string
): string {
  const fr = locale === "fr";
  const raw = error instanceof Error ? error.message.trim() : "";

  if (isAdminNetworkError(error)) {
    return fr
      ? "Impossible de joindre l'API admin. Vérifiez le réseau, puis réessayez."
      : "Could not reach the admin API. Check your network, then try again.";
  }

  if (SESSION_RE.test(raw)) {
    return fr
      ? "Session expirée. Connectez-vous à nouveau."
      : "Session expired. Sign in again.";
  }

  if (!raw || GENERIC_TECH_RE.test(raw) || NETWORK_RE.test(raw)) {
    return (
      fallback ||
      (fr
        ? "Une erreur s'est produite. Réessayez ou rafraîchissez la page."
        : "Something went wrong. Retry or refresh the page.")
    );
  }

  // Keep API business messages (validation, conflict, etc.); strip em dashes.
  return raw.replace(/\u2014/g, "-").replace(/—/g, "-");
}

/** Thrown from adminFetch when the browser cannot reach the API. */
export class AdminNetworkError extends Error {
  constructor() {
    super("ADMIN_NETWORK");
    this.name = "AdminNetworkError";
  }
}
