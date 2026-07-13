/** Format application screening job messages for admin UI. */

export type TalMatchedParty = {
  role?: string;
  name?: string;
};

export type TalDossier = {
  dossier?: string;
  address?: string;
  detail_url?: string;
  case_status?: string;
  name_match?: boolean;
  matched_parties?: TalMatchedParty[];
  landlord_match?: boolean;
  landlord_parties?: TalMatchedParty[];
  intervenants?: TalMatchedParty[];
  detail_skipped?: boolean;
  detail_error?: string;
};

export type TalSearch = {
  source?: string;
  search_precision?: string;
  status?: string;
  reason?: string;
  applicant_name?: string;
  dossier_count?: number;
  name_match_count?: number;
  landlord_mention_count?: number;
  elapsed_seconds?: number;
  building_detail_truncated?: boolean;
  input?: {
    postal?: string;
    civic?: string;
    apartment?: string | null;
    raw_address?: string;
  };
  dossiers?: TalDossier[];
};

export type TalScreeningPayload = {
  summary?: string;
  applicant_name?: string;
  searches?: TalSearch[];
};

export function parseTalScreeningMessage(message: string | null | undefined): TalScreeningPayload | null {
  if (!message?.trim().startsWith("{")) return null;
  try {
    const parsed = JSON.parse(message) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    if (!("searches" in obj) && !("summary" in obj) && !("applicant_name" in obj)) {
      return null;
    }
    return parsed as TalScreeningPayload;
  } catch {
    return null;
  }
}

export function formatJobMessagePreview(jobType: string, message: string | null): string {
  if (!message) return "—";
  if (jobType === "tal_screening") {
    const tal = parseTalScreeningMessage(message);
    if (tal?.summary) return tal.summary;
  }
  if (message.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(message) as { summary?: string };
      if (parsed.summary) return parsed.summary;
    } catch {
      /* fall through */
    }
    return "Résultat détaillé (voir ci-dessous)";
  }
  return message.length > 180 ? `${message.slice(0, 177)}…` : message;
}

export function sourceLabel(source: string | undefined): string {
  switch (source) {
    case "current_address":
      return "Adresse actuelle";
    case "previous_address":
      return "Adresse précédente";
    default:
      return source || "Adresse";
  }
}

export function precisionLabel(precision: string | undefined): string {
  switch (precision) {
    case "unit":
      return "unité";
    case "building":
      return "immeuble";
    default:
      return precision || "—";
  }
}

export function tenantFromDossier(dossier: TalDossier): string | null {
  const matched = dossier.matched_parties?.find((p) => p.name)?.name;
  if (matched) return matched;
  const tenant = dossier.intervenants?.find((p) =>
    (p.role || "").toLowerCase().includes("locataire")
  );
  return tenant?.name || null;
}

export function landlordFromDossier(dossier: TalDossier): string | null {
  const matched = dossier.landlord_parties?.find((p) => p.name)?.name;
  if (matched) return matched;
  const landlord = dossier.intervenants?.find((p) =>
    (p.role || "").toLowerCase().includes("locateur")
  );
  return landlord?.name || null;
}
