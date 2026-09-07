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
  raw_address?: string;
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
  slip_count?: number;
  employers?: string[];
  slips?: Array<Record<string, unknown>>;
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
    name_mismatch_payslip_form: "Nom du talon différent du formulaire",
    name_partial_missing: "Correspondance partielle (nom manquant)",
    employer_mismatch_form: "Employeur du talon ≠ contact RH",
    net_vs_declared_income: "Net du talon ≠ revenu déclaré",
    pay_math_inconsistent: "Calcul heures × taux incohérent",
    payslip_stale: "Date de paie trop ancienne (plus de 6 mois)",
    payslip_date_in_future: "Date de paie dans le futur",
    payslip_stale_or_future: "Date de paie trop ancienne ou dans le futur",
    income_doc_missing: "Talon de paie manquant",
    income_doc_unreadable: "Talon illisible",
    income_doc_partial: "Moins de 3 talons",
    payslip_net_inconsistent_across_slips: "Nets incohérents entre talons",
    employer_mismatch_across_slips: "Employeurs différents entre talons",
    payslip_partial_not_recognized: "Au moins un talon non reconnu",
  };
  const en: Record<string, string> = {
    payslip_not_recognized: "Does not look like a payslip",
    name_mismatch_payslip_form: "Name on the payslip doesn't match the application",
    name_partial_missing: "Partial match (missing name)",
    employer_mismatch_form: "Payslip employer ≠ HR contact",
    net_vs_declared_income: "Payslip net ≠ declared income",
    pay_math_inconsistent: "Hours × rate math inconsistent",
    payslip_stale: "Pay date is older than 6 months",
    payslip_date_in_future: "Pay date is in the future",
    payslip_stale_or_future: "Pay date is older than 6 months or in the future",
    income_doc_missing: "Payslip missing",
    income_doc_unreadable: "Payslip unreadable",
    income_doc_partial: "Fewer than 3 payslips",
    payslip_net_inconsistent_across_slips: "Nets inconsistent across slips",
    employer_mismatch_across_slips: "Employers differ across slips",
    payslip_partial_not_recognized: "At least one slip not recognized",
  };
  const map = locale === "en" ? en : fr;
  return map[flag] || flag.replaceAll("_", " ");
}

export function uniqueIncomeFlags(payload: IncomeDocumentExtractPayload): string[] {
  const flags = payload.flags ?? [];
  const slipFlags = new Set(
    (payload.slips ?? []).flatMap((slip) => {
      const value = slip.flags;
      return Array.isArray(value) ? value.filter((flag): flag is string => typeof flag === "string") : [];
    })
  );
  return flags.filter((flag) => {
    if (slipFlags.has(flag)) return false;
    if (flag === "payslip_not_recognized" && payload.payslip_like === false) return false;
    return true;
  });
}

function photoQualityWord(quality: string | undefined, locale: Locale): string | null {
  if (quality === "sharp") return locale === "fr" ? "nette" : "clear";
  if (quality === "soft") return locale === "fr" ? "un peu floue" : "a bit soft";
  if (quality === "blurry") return locale === "fr" ? "floue — à revérifier" : "blurry — check the photo";
  return null;
}

/** Plain-language ID photo quality. Omits the back when none was uploaded. */
export function formatIdPhotoQuality(
  payload: { blur_front?: { quality?: string } | null; blur_back?: { quality?: string } | null },
  locale: Locale = "fr"
): string | null {
  const front = photoQualityWord(payload.blur_front?.quality, locale);
  const back = photoQualityWord(payload.blur_back?.quality, locale);
  if (!front && !back) return null;
  // Don't nag when the photo is already clear.
  if (front && payload.blur_front?.quality === "sharp" && !back) return null;
  const parts: string[] = [];
  if (front && payload.blur_front?.quality !== "sharp") {
    parts.push(locale === "fr" ? `Photo de la pièce : ${front}` : `ID photo: ${front}`);
  }
  if (back && payload.blur_back?.quality !== "sharp") {
    parts.push(locale === "fr" ? `Verso : ${back}` : `Back of ID: ${back}`);
  }
  return parts.length ? parts.join(" · ") : null;
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
  if (payload.flags?.includes("income_doc_unreadable")) {
    return locale === "fr"
      ? `Talon illisible — vérification manuelle${flags}`
      : `Payslip unreadable — manual review${flags}`;
  }
  if (payload.flags?.includes("payslip_not_recognized")) {
    return locale === "fr"
      ? `Document non reconnu comme talon — vérification manuelle${flags}`
      : `Not recognized as payslip — manual review${flags}`;
  }
  if (payload.flags?.includes("payslip_partial_not_recognized")) {
    return locale === "fr"
      ? `Au moins un talon non reconnu — vérification manuelle${flags}`
      : `At least one slip not recognized — manual review${flags}`;
  }
  const bits: string[] = [];
  if (payload.slip_count && payload.slip_count > 1) {
    bits.push(
      locale === "fr" ? `${payload.slip_count} talons` : `${payload.slip_count} slips`
    );
  }
  if (payload.employer_name) bits.push(payload.employer_name);
  if (payload.net_pay != null) {
    bits.push(
      locale === "fr" ? `net ${payload.net_pay}` : `net ${payload.net_pay}`
    );
  }
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
      if (
        idExtract.flags?.includes("name_not_extracted") ||
        idExtract.flags?.includes("blur_front") ||
        idExtract.flags?.includes("blur_back")
      ) {
        return locale === "fr"
          ? `Pièce peu lisible — vérification manuelle${flags}`
          : `ID poorly readable — manual review${flags}`;
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
        return "Form — current address";
      case "previous_address":
        return "Form — previous address";
      case "id_pdf417_address":
        return "ID (barcode)";
      case "id_front_ocr_address":
        return "ID (front)";
      case "id_back_ocr_address":
        return "ID (back)";
      case "id_sticker_address":
        return "ID (sticker)";
      case "income_doc_address":
        return "Proof of income";
      default:
        return source || "Address";
    }
  }
  switch (source) {
    case "current_address":
      return "Formulaire — adresse actuelle";
    case "previous_address":
      return "Formulaire — adresse précédente";
    case "id_pdf417_address":
      return "Pièce d'identité (code-barres)";
    case "id_front_ocr_address":
      return "Pièce d'identité (recto)";
    case "id_back_ocr_address":
      return "Pièce d'identité (verso)";
    case "id_sticker_address":
      return "Pièce d'identité (autocollant)";
    case "income_doc_address":
      return "Preuve de revenu";
    default:
      return source || "Adresse";
  }
}

/** Map TAL skip/fail reason codes to admin-facing copy. */
export function talReasonLabel(
  reason: string | undefined,
  source: string | undefined,
  locale: Locale = "fr"
): string {
  if (!reason) return "";
  const isPayslipAddressIssue =
    reason === "payslip_address_unusable" ||
    (source === "income_doc_address" &&
      ["missing_postal_code", "missing_civic_number", "empty_address"].includes(
        reason
      ));
  if (isPayslipAddressIssue) {
    return locale === "fr"
      ? "Aucune adresse utilisable trouvée sur le talon de paie"
      : "No usable address found on the payslip";
  }
  if (locale === "en") {
    switch (reason) {
      case "missing_postal_code":
        return "Incomplete address — no postal code";
      case "missing_civic_number":
        return "Incomplete address — no street number";
      case "empty_address":
        return "No address provided";
      case "not_quebec":
        return "Outside Quebec — not searched";
      default:
        return reason;
    }
  }
  switch (reason) {
    case "missing_postal_code":
      return "Adresse incomplète — code postal manquant";
    case "missing_civic_number":
      return "Adresse incomplète — numéro civique manquant";
    case "empty_address":
      return "Aucune adresse fournie";
    case "not_quebec":
      return "Hors Québec — non recherchée";
    default:
      return reason;
  }
}

/** Legacy stub / non-screening job rows hidden from the admin Screening panel. */
export const HIDDEN_SCREENING_JOB_TYPES = new Set([
  "ai_id_check",
  "ai_social_check",
  "applicant_confirmation",
  "admin_notify",
]);

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
        return "Canadian ID (licence / RAMQ)";
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
      return "Pièce canadienne (permis / RAMQ)";
    case "passport_only":
      return "Passeport (nom seulement)";
    case "none":
      return "Aucune pièce";
    default:
      return context || "—";
  }
}

// ── SOQUIJ ──────────────────────────────────────────────────────────────────

export type SoquijDecision = {
  title?: string;
  parties?: string;
  date?: string;
  tribunal?: string;
  url?: string;
  dossier?: string;
  /** strong = given+family in parties; surname = family only; related = verify in decision */
  match_level?: "strong" | "surname" | "related" | null;
  /** True when match_level is strong or surname. */
  name_match?: boolean;
  /** 'respondent' = applicant was sued (red flag); 'plaintiff' = applicant sued someone */
  applicant_role?: "respondent" | "plaintiff";
  tribunal_rank?: number;
};

export type SoquijScreeningPayload = {
  query?: string;
  status?: string;
  decision_count?: number;
  /** Decisions with given + family name in parties. */
  strong_match_count?: number;
  /** Decisions where the family name matched in parties (includes strong). */
  name_match_count?: number;
  /** Corporate / full-text SOQUIJ hits — open decision to verify. */
  related_count?: number;
  /** Decisions where the applicant appears as respondent/defendant. */
  respondent_count?: number;
  decisions?: SoquijDecision[];
  has_flags?: boolean;
  elapsed_seconds?: number;
  note?: string;
  mock?: boolean;
  summary?: string;
  reason?: string;
};

/** Fields that must be a string (or absent) in a SOQUIJ payload. */
const SOQUIJ_STRING_FIELDS = [
  "query", "status", "note", "reason", "summary",
] as const;

const VALID_APPLICANT_ROLES = new Set(["respondent", "plaintiff"]);

/** Fields that must be a string (or absent) within each decision entry. */
const SOQUIJ_DECISION_STRING_FIELDS = [
  "title", "parties", "date", "tribunal", "url", "dossier",
] as const;

function isStringOrAbsent(v: unknown): boolean {
  return v === undefined || v === null || typeof v === "string";
}

export function parseSoquijScreeningMessage(
  message: string | null | undefined
): SoquijScreeningPayload | null {
  if (!message?.trim().startsWith("{")) return null;
  try {
    const parsed = JSON.parse(message) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const obj = parsed as Record<string, unknown>;

    // Top-level string fields must not be non-string objects
    for (const field of SOQUIJ_STRING_FIELDS) {
      if (!isStringOrAbsent(obj[field])) return null;
    }

    // decision_count, name_match_count, respondent_count must be non-negative safe integers or absent
    for (const countField of [
      "decision_count",
      "name_match_count",
      "strong_match_count",
      "related_count",
      "respondent_count",
    ] as const) {
      if (obj[countField] !== undefined) {
        const dc = obj[countField];
        if (
          typeof dc !== "number" ||
          !Number.isInteger(dc) ||
          dc < 0 ||
          dc > Number.MAX_SAFE_INTEGER
        )
          return null;
      }
    }

    // boolean flags must be boolean or absent
    for (const flag of ["has_flags", "mock"] as const) {
      if (obj[flag] !== undefined && typeof obj[flag] !== "boolean") return null;
    }

    // decisions must be an array of well-shaped objects
    if (obj["decisions"] !== undefined) {
      if (!Array.isArray(obj["decisions"])) return null;
      for (const entry of obj["decisions"] as unknown[]) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
        const d = entry as Record<string, unknown>;
        for (const field of SOQUIJ_DECISION_STRING_FIELDS) {
          if (!isStringOrAbsent(d[field])) return null;
        }
        if (d["name_match"] !== undefined && typeof d["name_match"] !== "boolean")
          return null;
        if (
          d["match_level"] !== undefined &&
          d["match_level"] !== null &&
          d["match_level"] !== "strong" &&
          d["match_level"] !== "surname" &&
          d["match_level"] !== "related"
        )
          return null;
        if (
          d["applicant_role"] !== undefined &&
          !VALID_APPLICANT_ROLES.has(d["applicant_role"] as string)
        )
          return null;
        if (d["tribunal_rank"] !== undefined && typeof d["tribunal_rank"] !== "number")
          return null;
      }
    }

    return obj as SoquijScreeningPayload;
  } catch {
    return null;
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
