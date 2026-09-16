/** Application / member status labels for admin UI (FR default, EN for locale toggle). */

import type { Locale } from "./i18n";

/** DB application statuses — do not invent parallel values. */
export const APPLICATION_STATUSES = [
  "draft",
  "collecting",
  "submitted",
  "awaiting_credit_check",
  "accepted",
  "rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

const APPLICATION_STATUS_LABELS: Record<Locale, Record<ApplicationStatus, string>> = {
  fr: {
    draft: "Brouillon",
    collecting: "En collecte",
    submitted: "À examiner",
    awaiting_credit_check: "Crédit en cours",
    accepted: "Acceptée",
    rejected: "Refusée",
  },
  en: {
    draft: "Draft",
    collecting: "Collecting",
    submitted: "Pending review",
    awaiting_credit_check: "Credit check",
    accepted: "Accepted",
    rejected: "Rejected",
  },
};

const MEMBER_STATUS_LABELS: Record<Locale, Record<string, string>> = {
  fr: {
    submitted: "Envoyé",
    invited: "Invité (en attente)",
    draft: "Brouillon",
  },
  en: {
    submitted: "Submitted",
    invited: "Invited (pending)",
    draft: "Draft",
  },
};

export function applicationStatusLabel(
  status: string,
  locale: Locale = "fr",
): string {
  const labels = APPLICATION_STATUS_LABELS[locale];
  if (status in labels) {
    return labels[status as ApplicationStatus];
  }
  return status;
}

export function memberStatusLabel(status: string, locale: Locale = "fr"): string {
  return MEMBER_STATUS_LABELS[locale][status] ?? status;
}
