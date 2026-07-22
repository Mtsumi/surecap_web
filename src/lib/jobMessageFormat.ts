/** Format application screening job messages for admin UI. */

import type { Locale } from "./i18n";

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

export type IncomeDocumentExtractPayload = {
  document_type?: string;
  read_path?: string;
  employee_name?: string | null;
  employer_name?: string | null;
  pay_period_start?: string | null;
  pay_period_end?: string | null;
  pay_date?: string | null;
  hourly_rate?: number | null;
  hours?: number | null;
  gross_pay?: number | null;
  net_pay?: number | null;
  payslip_like?: boolean;
  flags?: string[];
  qc_markers?: string[];
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

export function idExtractFlagLabel(flag: string, locale: Locale = "fr"): string {
  if (locale === "en") {
    if (flag === "blur_front") return "Front photo blurry";
    if (flag === "blur_back") return "Back photo blurry";
    if (flag === "non_canadian_id_context") return "Non-Canadian ID (passport)";
    if (flag === "address_not_in_canada") return "Address outside Canada (form)";
    if (flag === "name_only_verification") return "Name verification only";
    if (flag === "name_not_extracted") return "Name not read from ID";
    if (flag === "barcode_ocr_name_mismatch") return "PDF417 name ≠ OCR";
    if (flag.startsWith("address_skip:"))
      return `ID address skipped (${flag.split(":").slice(1).join(":")})`;
    return flag.replaceAll("_", " ");
  }
  if (flag === "blur_front") return "Photo recto floue";
  if (flag === "blur_back") return "Photo verso floue";
  if (flag === "non_canadian_id_context") return "Pièce non canadienne (passeport)";
  if (flag === "address_not_in_canada") return "Adresse hors Canada (formulaire)";
  if (flag === "name_only_verification") return "Vérification du nom seulement";
  if (flag === "name_not_extracted") return "Nom non lu sur la pièce";
  if (flag === "barcode_ocr_name_mismatch") return "Nom PDF417 ≠ OCR";
  if (flag.startsWith("address_skip:"))
    return `Adresse ID ignorée (${flag.split(":").slice(1).join(":")})`;
  return flag.replaceAll("_", " ");
}

export function parseIncomeDocumentExtractMessage(
  message: string | null | undefined
): IncomeDocumentExtractPayload | null {
  if (!message?.trim().startsWith("{")) return null;
  try {
    const parsed = JSON.parse(message) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    if (
      !("read_path" in obj) &&
      !("payslip_like" in obj) &&
      !("net_pay" in obj) &&
      !("employee_name" in obj)
    ) {
      return null;
    }
    // Avoid mistaking ID extract payloads
    if ("screening_context" in obj || "addresses" in obj) return null;
    return parsed as IncomeDocumentExtractPayload;
  } catch {
    return null;
  }
}

export function incomeExtractFlagLabel(flag: string, locale: Locale = "fr"): string {
  const fr: Record<string, string> = {
    payslip_not_recognized: "Ne ressemble pas à un talon de paie",
    name_mismatch_payslip_form: "Nom du talon ≠ formulaire",
    employer_mismatch_form: "Employeur du talon ≠ contact RH",
    net_vs_declared_income: "Net du talon ≠ revenu déclaré",
    pay_math_inconsistent: "Calcul heures × taux incohérent",
    payslip_stale_or_future: "Date de paie trop ancienne ou future",
    income_doc_missing: "Talon de paie manquant",
    income_doc_unreadable: "Talon illisible",
  };
  const en: Record<string, string> = {
    payslip_not_recognized: "Does not look like a payslip",
    name_mismatch_payslip_form: "Payslip name ≠ form",
    employer_mismatch_form: "Payslip employer ≠ HR contact",
    net_vs_declared_income: "Payslip net ≠ declared income",
    pay_math_inconsistent: "Hours × rate math inconsistent",
    payslip_stale_or_future: "Pay date too old or in the future",
    income_doc_missing: "Payslip missing",
    income_doc_unreadable: "Payslip unreadable",
  };
  const map = locale === "en" ? en : fr;
  return map[flag] || flag.replaceAll("_", " ");
}

export function formatIncomeExtractPreview(
  payload: IncomeDocumentExtractPayload,
  locale: Locale = "fr"
): string {
  const flags = payload.flags?.length
    ? ` · ${payload.flags.length} ${locale === "fr" ? "signal(s)" : "flag(s)"}`
    : "";
  if (payload.flags?.includes("income_doc_missing")) {
    return locale === "fr" ? `Talon manquant${flags}` : `Payslip missing${flags}`;
  }
  if (payload.flags?.includes("payslip_not_recognized")) {
    return locale === "fr"
      ? `Document non reconnu comme talon${flags}`
      : `Not recognized as payslip${flags}`;
  }
  const bits: string[] = [];
  if (payload.employer_name) bits.push(payload.employer_name);
  if (payload.net_pay != null) {
    bits.push(
      locale === "fr" ? `net ${payload.net_pay}` : `net ${payload.net_pay}`
    );
  }
  if (payload.read_path) bits.push(payload.read_path);
  if (bits.length === 0) {
    return locale === "fr" ? `Vérification revenu${flags}` : `Income check${flags}`;
  }
  return `${bits.join(" · ")}${flags}`;
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

/** Prefer full address; fall back to postal / civic / apt parts. */
export function formatSearchAddress(
  input: TalSearch["input"] | undefined,
  locale: Locale = "fr"
): string | null {
  if (!input) return null;
  const raw = input.raw_address?.trim();
  if (raw) return raw;
  const aptWord = locale === "fr" ? "app." : "apt";
  const parts: string[] = [];
  if (input.civic?.trim()) parts.push(input.civic.trim());
  if (input.apartment != null && String(input.apartment).trim()) {
    parts.push(`${aptWord} ${String(input.apartment).trim()}`);
  }
  if (input.postal?.trim()) parts.push(input.postal.trim().toUpperCase());
  return parts.length ? parts.join(" · ") : null;
}

export function pluralCount(count: number, one: string, other: string): string {
  return `${count} ${count === 1 ? one : other}`;
}

/** Locale-aware TAL preview — avoid raw English API summaries when searches exist. */
export function formatTalScreeningPreview(
  payload: TalScreeningPayload,
  locale: Locale = "fr"
): string {
  const searches = payload.searches || [];
  if (searches.length === 0) {
    if (payload.summary?.trim()) return payload.summary.trim();
    return locale === "fr" ? "Aucun résultat TAL" : "No TAL results";
  }
  const completed = searches.filter((s) => s.status === "completed").length;
  const dossiers = searches.reduce(
    (sum, s) => sum + (s.dossier_count ?? s.dossiers?.length ?? 0),
    0
  );
  const tenantHits = searches.reduce((sum, s) => sum + (s.name_match_count ?? 0), 0);
  if (locale === "fr") {
    return `${pluralCount(searches.length, "adresse", "adresses")} · ${completed}/${searches.length} terminée(s) · ${pluralCount(dossiers, "dossier", "dossiers")}${tenantHits ? ` · ${pluralCount(tenantHits, "locataire", "locataires")}` : ""}`;
  }
  return `${pluralCount(searches.length, "address", "addresses")} · ${completed}/${searches.length} completed · ${pluralCount(dossiers, "dossier", "dossiers")}${tenantHits ? ` · ${pluralCount(tenantHits, "tenant match", "tenant matches")}` : ""}`;
}

export function formatJobMessagePreview(
  jobType: string,
  message: string | null,
  locale: Locale = "fr"
): string {
  if (!message) return "—";
  if (jobType === "tal_screening") {
    const tal = parseTalScreeningMessage(message);
    if (tal) return formatTalScreeningPreview(tal, locale);
  }
  if (jobType === "id_document_extract") {
    const idExtract = parseIdDocumentExtractMessage(message);
    if (idExtract) {
      const flagWord =
        locale === "fr"
          ? pluralCount(idExtract.flags?.length || 0, "signal", "signaux")
          : pluralCount(idExtract.flags?.length || 0, "flag", "flags");
      const flags = idExtract.flags?.length ? ` · ${flagWord}` : "";
      if (idExtract.name_mismatch) {
        return locale === "fr"
          ? `Nom différent du formulaire${flags}`
          : `Name differs from form${flags}`;
      }
      if (idExtract.pdf417_ok) {
        return `PDF417 (${idExtract.pdf417_variant || "ok"})${flags}`;
      }
      return `${idScreeningContextLabel(idExtract.screening_context, locale)}${flags}`;
    }
  }
  if (jobType === "income_document_extract") {
    const income = parseIncomeDocumentExtractMessage(message);
    if (income) return formatIncomeExtractPreview(income, locale);
  }
  if (message.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(message) as { summary?: string };
      if (parsed.summary) return parsed.summary;
    } catch {
      /* fall through */
    }
    return locale === "fr"
      ? "Résultat détaillé (voir ci-dessous)"
      : "Detailed result (see below)";
  }
  return message.length > 180 ? `${message.slice(0, 177)}…` : message;
}

export function sourceLabel(source: string | undefined, locale: Locale = "fr"): string {
  if (locale === "en") {
    switch (source) {
      case "current_address":
        return "Current address";
      case "previous_address":
        return "Previous address";
      case "id_pdf417_address":
        return "Licence address (PDF417)";
      case "id_front_ocr_address":
        return "Licence address (front OCR)";
      case "id_sticker_address":
        return "SAAQ sticker address";
      default:
        return source || "Address";
    }
  }
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

export function jobTypeLabel(jobType: string, locale: Locale = "fr"): string {
  switch (jobType) {
    case "tal_screening":
      return "TAL";
    case "id_document_extract":
      return locale === "fr" ? "Pièce d'identité" : "ID document";
    case "income_document_extract":
      return locale === "fr" ? "Talon de paie" : "Payslip";
    case "soquij_screening":
      return "SOQUIJ";
    case "admin_notify":
      return locale === "fr" ? "Notification admin" : "Admin notification";
    case "applicant_confirmation":
      return locale === "fr" ? "Confirmation demandeur" : "Applicant confirmation";
    default:
      return jobType;
  }
}

export function precisionLabel(precision: string | undefined, locale: Locale = "fr"): string {
  if (locale === "en") {
    switch (precision) {
      case "unit":
        return "unit";
      case "building":
        return "building";
      default:
        return precision || "—";
    }
  }
  switch (precision) {
    case "unit":
      return "unité";
    case "building":
      return "immeuble";
    default:
      return precision || "—";
  }
}

export function idScreeningContextLabel(
  context: string | undefined,
  locale: Locale = "fr"
): string {
  if (locale === "en") {
    switch (context) {
      case "canadian":
        return "Canadian licence / card";
      case "passport_only":
        return "Passport (name only)";
      case "none":
        return "No ID";
      default:
        return context || "—";
    }
  }
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
