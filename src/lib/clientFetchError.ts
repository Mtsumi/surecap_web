/** Applicant / public UI: map fetch failures to short FR/EN copy (never "Failed to fetch"). */

import type { Locale } from "./i18n";

const NETWORK_RE =
  /failed to fetch|load failed|networkerror|network request failed|fetch failed|err_network|econnrefused|enotfound|impossible de joindre le serveur|could not reach the (admin )?api|could not reach the server/i;

const GENERIC_TECH_RE =
  /internal server error|bad gateway|service unavailable|gateway timeout|empty (api )?response|status text|econnreset/i;

export class ClientNetworkError extends Error {
  constructor() {
    super("CLIENT_NETWORK");
    this.name = "ClientNetworkError";
  }
}

export function isClientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "ClientNetworkError" || error.name === "AdminNetworkError") {
    return true;
  }
  if (error.message === "CLIENT_NETWORK" || error.message === "ADMIN_NETWORK") {
    return true;
  }
  return NETWORK_RE.test(error.message);
}

export function formatClientFetchError(
  error: unknown,
  locale: Locale = "fr",
  fallback?: string
): string {
  const fr = locale === "fr";
  const raw = error instanceof Error ? error.message.trim() : "";

  if (isClientNetworkError(error)) {
    return fr
      ? "Impossible de joindre le serveur. Vérifiez la connexion, puis réessayez."
      : "Could not reach the server. Check your connection, then try again.";
  }

  if (!raw || GENERIC_TECH_RE.test(raw) || NETWORK_RE.test(raw)) {
    return (
      fallback ||
      (fr
        ? "Une erreur s'est produite. Réessayez ou rafraîchissez la page."
        : "Something went wrong. Retry or refresh the page.")
    );
  }

  return raw.replace(/\u2014/g, "-").replace(/—/g, "-");
}
