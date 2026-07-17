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
  id_extract?: IdExtractSummary;
};

export type IdAddressCandidate = {
  source?: string;
  raw_address?: string;
  explicit_apartment?: string | null;
  confidence?: string;
  tal_ready?: boolean;
  tal_skip_reason?: string | null;
};

export type IdDocumentExtractPayload = {
  screening_context?: string;
  context_reason?: string;
  extract_addresses?: boolean;
  extract_name?: boolean;
  blur_front?: {
    laplacian_var?: number | null;
    quality?: string;
    accept_for_ocr?: boolean;
    should_retake?: boolean;
  } | null;
  blur_back?: IdDocumentExtractPayload["blur_front"];
  ocr_name?: string | null;
  barcode_name?: string | null;
  addresses?: IdAddressCandidate[];
  flags?: string[];
  name_mismatch?: boolean | null;
  pdf417_ok?: boolean;
  pdf417_variant?: string | null;
};

export type IdExtractSummary = {
  screening_context?: string;
  context_reason?: string;
  flags?: string[];
  name_mismatch?: boolean | null;
  ocr_name?: string | null;
  barcode_name?: string | null;
  pdf417_ok?: boolean;
  pdf417_variant?: string | null;
  address_sources?: string[];
};

export function parseIdDocumentExtractMessage(
  message: string | null | undefined
): IdDocumentExtractPayload | null {
  if (!message?.trim().startsWith("{")) return null;
  try {
    const parsed = JSON.parse(message) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    if (!("screening_context" in obj) && !("flags" in obj) && !("addresses" in obj)) {
      return null;
    }
    return parsed as IdDocumentExtractPayload;
  } catch {
    return null;
  }
}

export function idExtractFlagLabel(flag: string): string {
  if (flag === "blur_front") return "Photo recto floue";
  if (flag === "blur_back") return "Photo verso floue";
  if (flag === "non_canadian_id_context") return "Pièce non canadienne (passeport)";
  if (flag === "address_not_in_canada") return "Adresse hors Canada (formulaire)";
  if (flag === "name_only_verification") return "Vérification du nom seulement";
  if (flag === "name_not_extracted") return "Nom non lu sur la pièce";
  if (flag === "barcode_ocr_name_mismatch") return "Nom PDF417 ≠ OCR";
  if (flag.startsWith("address_skip:")) return `Adresse ID ignorée (${flag.split(":").slice(1).join(":")})`;
  return flag.replaceAll("_", " ");
}

export function idScreeningContextLabel(context: string | undefined): string {
  switch (context) {
    case "canadian":
      return "Permis / carte canadienne";
    case "passport_only":
      return "Passeport (nom seulement)";
    case "none":
      return "Aucune pièce";
    default:
      return context || "—";
  }
}

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
  if (jobType === "id_document_extract") {
    const idExtract = parseIdDocumentExtractMessage(message);
    if (idExtract) {
      const flags = idExtract.flags?.length ? ` · ${idExtract.flags.length} signal(s)` : "";
      if (idExtract.name_mismatch) {
        return `Nom différent du formulaire${flags}`;
      }
      if (idExtract.pdf417_ok) {
        return `PDF417 lu (${idExtract.pdf417_variant || "ok"})${flags}`;
      }
      return `${idScreeningContextLabel(idExtract.screening_context)}${flags}`;
    }
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
    case "id_pdf417_address":
      return "Adresse permis (PDF417)";
    case "id_front_ocr_address":
      return "Adresse permis (OCR recto)";
    case "id_sticker_address":
      return "Adresse autocollant SAAQ";
    default:
      return source || "Adresse";
  }
}

export function jobTypeLabel(jobType: string): string {
  switch (jobType) {
    case "tal_screening":
      return "TAL";
    case "id_document_extract":
      return "Pièce d'identité";
    case "soquij_screening":
      return "SOQUIJ";
    case "admin_notify":
      return "Notification admin";
    case "applicant_confirmation":
      return "Confirmation demandeur";
    default:
      return jobType;
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
