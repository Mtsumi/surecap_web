/** Compact ID / payslip / TAL / SOQUIJ rows for the admin screening glance table. */

import type { Locale } from "./i18n";
import {
  formatIdPhotoQuality,
  formatSoquijFailure,
  formatSoquijScreeningPreview,
  formatTalFailure,
  formatTalScreeningPreview,
  incomeExtractFlagLabel,
  uniqueIncomeFlags,
  type IdDocumentExtractPayload,
  type IncomeDocumentExtractPayload,
  type SoquijScreeningPayload,
  type TalScreeningPayload,
} from "./jobMessageFormat";
import {
  isIdExtractInconclusive,
  isIncomeExtractInconclusive,
} from "./documentExtractReview";
import { nameSimilarity, documentHasExtraName } from "./names";

export type GlanceTone = "ok" | "warn" | "bad" | "pending" | "neutral";

export type ScreeningGlanceRow = {
  key: "id" | "income" | "household" | "tal" | "soquij";
  tone: GlanceTone;
  checkLabel: string;
  summary: string;
  issues: string[];
};

export type HouseholdAffordability = {
  rent: number | null;
  declared_monthly: number | null;
  declared_ratio: number | null;
  declared_tone: string;
  declared_label: string;
  ocr_monthly: number | null;
  ocr_note: string | null;
  ocr_ratio: number | null;
  ocr_tone: string;
  ocr_label: string;
};

const PAYSLIP_BAD_FLAGS = new Set([
  "income_doc_unreadable",
  "payslip_not_recognized",
  "income_doc_missing",
  "payslip_partial_not_recognized",
]);

const PAYSLIP_WARN_FLAGS = new Set([
  "payslip_stale",
  "payslip_date_in_future",
  "payslip_stale_or_future",
  "name_mismatch_payslip_form",
  "name_partial_missing",
  "employer_mismatch_form",
  "net_vs_declared_income",
  "pay_math_inconsistent",
  "payslip_net_inconsistent_across_slips",
  "employer_mismatch_across_slips",
]);

function money(value: number, locale: Locale): string {
  const formatted = value.toLocaleString(locale === "fr" ? "fr-CA" : "en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return locale === "fr" ? `${formatted} $` : `$${formatted}`;
}

function jobTone(status: string): GlanceTone | null {
  if (status === "pending" || status === "running") return "pending";
  if (status === "failed") return "bad";
  if (status === "skipped") return "neutral";
  return null;
}

function pendingSummary(status: string, locale: Locale): string {
  if (status === "pending") {
    return locale === "fr" ? "En file" : "Queued";
  }
  return locale === "fr" ? "En cours" : "Running";
}

export function idScreeningGlance(
  payload: IdDocumentExtractPayload | null,
  status: string,
  locale: Locale,
  formName?: string | null
): ScreeningGlanceRow {
  const checkLabel = locale === "fr" ? "Pièce d'identité" : "ID";
  const fromJob = jobTone(status);
  if (fromJob === "pending") {
    return {
      key: "id",
      tone: "pending",
      checkLabel,
      summary: pendingSummary(status, locale),
      issues: [],
    };
  }
  if (fromJob === "bad") {
    return {
      key: "id",
      tone: "bad",
      checkLabel,
      summary: locale === "fr" ? "Lecture échouée" : "Extract failed",
      issues: [
        locale === "fr"
          ? "Relancez l'extraction ou vérifiez les photos"
          : "Re-run extract or check the ID photos",
      ],
    };
  }
  if (fromJob === "neutral" && !payload) {
    return {
      key: "id",
      tone: "neutral",
      checkLabel,
      summary: locale === "fr" ? "Ignoré" : "Skipped",
      issues: [],
    };
  }
  if (!payload) {
    return {
      key: "id",
      tone: status === "completed" ? "warn" : "neutral",
      checkLabel,
      summary: locale === "fr" ? "Résultat indisponible" : "No extract result",
      issues: [],
    };
  }

  const name = (payload.barcode_name || payload.ocr_name || "").trim();
  const photo = formatIdPhotoQuality(payload, locale);
  const issues: string[] = [];
  if (photo) issues.push(photo);

  const form = (formName || "").trim();
  const similarity = form && name ? nameSimilarity(form, name) : null;
  const mismatched =
    similarity === "mismatch" ||
    (similarity === null && (payload.name_mismatch === true || !name));

  if (similarity === "near") {
    return {
      key: "id",
      tone: "warn",
      checkLabel,
      summary:
        locale === "fr"
          ? `${name} proche du formulaire`
          : `${name} close to form name`,
      issues: [
        ...issues,
        locale === "fr" ? `Formulaire : ${form}` : `Form: ${form}`,
      ],
    };
  }

  if (similarity === "partial") {
    const extraOnId = documentHasExtraName(form, name);
    return {
      key: "id",
      tone: "warn",
      checkLabel,
      summary: extraOnId
        ? locale === "fr"
          ? `${name} : nom supplémentaire vs formulaire`
          : `${name}: ID has an extra name vs the form`
        : locale === "fr"
          ? `${name} : nom manquant vs formulaire`
          : `${name}: ID is missing a name from the form`,
      issues: [
        ...issues,
        locale === "fr" ? `Formulaire : ${form}` : `Form: ${form}`,
      ],
    };
  }

  if (mismatched) {
    return {
      key: "id",
      tone: "bad",
      checkLabel,
      summary: name
        ? locale === "fr"
          ? `${name} ≠ formulaire`
          : `${name} ≠ form`
        : locale === "fr"
          ? "Nom non lu"
          : "Name not read",
      issues,
    };
  }

  const inconclusive = isIdExtractInconclusive(payload);
  return {
    key: "id",
    tone: inconclusive ? "warn" : "ok",
    checkLabel,
    summary: name,
    issues,
  };
}

export function incomeScreeningGlance(
  payload: IncomeDocumentExtractPayload | null,
  status: string,
  locale: Locale
): ScreeningGlanceRow {
  const checkLabel = locale === "fr" ? "Talon de paie" : "Pay stub";
  const fromJob = jobTone(status);
  if (fromJob === "pending") {
    return {
      key: "income",
      tone: "pending",
      checkLabel,
      summary: pendingSummary(status, locale),
      issues: [],
    };
  }
  if (fromJob === "bad") {
    return {
      key: "income",
      tone: "bad",
      checkLabel,
      summary: locale === "fr" ? "Lecture échouée" : "Extract failed",
      issues: [
        locale === "fr"
          ? "Relancez l'extraction ou vérifiez les talons de paie"
          : "Re-run extract or check the pay stubs",
      ],
    };
  }
  if (fromJob === "neutral" && !payload) {
    return {
      key: "income",
      tone: "neutral",
      checkLabel,
      summary: locale === "fr" ? "Ignoré" : "Skipped",
      issues: [],
    };
  }
  if (!payload) {
    return {
      key: "income",
      tone: status === "completed" ? "warn" : "neutral",
      checkLabel,
      summary: locale === "fr" ? "Résultat indisponible" : "No extract result",
      issues: [],
    };
  }

  const flags = uniqueIncomeFlags(payload);
  const employers = Array.isArray(payload.employers)
    ? payload.employers.filter((name): name is string => typeof name === "string" && name.trim().length > 0)
    : payload.employer_name
      ? [payload.employer_name]
      : [];
  const facts: string[] = [];
  if (employers.length >= 2) {
    facts.push(
      locale === "fr"
        ? `${employers.length} emplois : ${employers.join("; ")}`
        : `${employers.length} jobs: ${employers.join("; ")}`
    );
  } else if (employers[0]) {
    facts.push(employers[0]);
  }
  if (payload.net_pay != null) {
    facts.push(
      locale === "fr" ? `net ${money(payload.net_pay, locale)}` : `net ${money(payload.net_pay, locale)}`
    );
  }
  if (payload.hourly_rate != null && payload.hours != null) {
    facts.push(
      locale === "fr"
        ? `${payload.hours} h × ${money(payload.hourly_rate, locale)}`
        : `${payload.hours}h @ ${money(payload.hourly_rate, locale)}`
    );
  } else if (payload.hours != null) {
    facts.push(locale === "fr" ? `${payload.hours} h` : `${payload.hours}h`);
  }
  if (payload.slip_count && payload.slip_count > 1) {
    facts.push(
      locale === "fr"
        ? `${payload.slip_count} talons de paie`
        : `${payload.slip_count} pay stubs`
    );
  }

  const bad = flags.filter((flag) => PAYSLIP_BAD_FLAGS.has(flag));
  const warn = flags.filter((flag) => PAYSLIP_WARN_FLAGS.has(flag));
  const other = flags.filter(
    (flag) => !PAYSLIP_BAD_FLAGS.has(flag) && !PAYSLIP_WARN_FLAGS.has(flag)
  );
  const issues = [...bad, ...warn, ...other].map((flag) =>
    incomeExtractFlagLabel(flag, locale)
  );

  if (bad.length > 0 || (isIncomeExtractInconclusive(payload) && !payload.payslip_like)) {
    return {
      key: "income",
      tone: "bad",
      checkLabel,
      summary: facts.join(" · ") || (locale === "fr" ? "Non lu" : "Not read"),
      issues,
    };
  }

  if (warn.length > 0 || isIncomeExtractInconclusive(payload)) {
    return {
      key: "income",
      tone: "warn",
      checkLabel,
      summary: facts.join(" · ") || (locale === "fr" ? "À vérifier" : "Needs review"),
      issues,
    };
  }

  return {
    key: "income",
    tone: payload.payslip_like === false ? "warn" : "ok",
    checkLabel,
    summary: facts.join(" · ") || (locale === "fr" ? "Lu" : "Read"),
    issues,
  };
}

function asGlanceTone(value: string): GlanceTone {
  if (value === "ok" || value === "warn" || value === "bad" || value === "pending") {
    return value;
  }
  return "neutral";
}

export function talScreeningGlance(
  payload: TalScreeningPayload | null,
  status: string,
  locale: Locale
): ScreeningGlanceRow {
  const checkLabel = "TAL";
  const fromJob = jobTone(status);
  if (fromJob === "pending") {
    return {
      key: "tal",
      tone: "pending",
      checkLabel,
      summary: pendingSummary(status, locale),
      issues: [],
    };
  }
  if (fromJob === "bad" || fromJob === "neutral") {
    const failure = formatTalFailure(payload, locale);
    const fallback =
      fromJob === "neutral"
        ? locale === "fr"
          ? "Ignoré"
          : "Skipped"
        : locale === "fr"
          ? "Échec"
          : "Failed";
    return {
      key: "tal",
      tone: fromJob === "bad" ? "bad" : "neutral",
      checkLabel,
      summary: failure?.title || fallback,
      issues: failure?.detail ? [failure.detail] : [],
    };
  }
  if (!payload) {
    return {
      key: "tal",
      tone: status === "completed" ? "warn" : "neutral",
      checkLabel,
      summary: locale === "fr" ? "Résultat indisponible" : "No TAL result",
      issues: [],
    };
  }
  const searches = payload.searches || [];
  const tenantHits = searches.reduce((sum, s) => sum + (s.name_match_count ?? 0), 0);
  const landlordHits = searches.reduce(
    (sum, s) => sum + (s.landlord_mention_count ?? 0),
    0
  );
  const issues: string[] = [];
  if (tenantHits > 0) {
    issues.push(
      locale === "fr"
        ? `${tenantHits} correspondance(s) locataire`
        : `${tenantHits} tenant match(es)`
    );
  }
  if (landlordHits > 0) {
    issues.push(
      locale === "fr"
        ? `${landlordHits} mention(s) locateur`
        : `${landlordHits} landlord mention(s)`
    );
  }
  return {
    key: "tal",
    tone: tenantHits > 0 ? "warn" : landlordHits > 0 ? "warn" : "ok",
    checkLabel,
    summary: formatTalScreeningPreview(payload, locale),
    issues,
  };
}

export function soquijScreeningGlance(
  payload: SoquijScreeningPayload | null,
  status: string,
  locale: Locale
): ScreeningGlanceRow {
  const checkLabel = "SOQUIJ";
  const fromJob = jobTone(status);
  if (fromJob === "pending") {
    return {
      key: "soquij",
      tone: "pending",
      checkLabel,
      summary: pendingSummary(status, locale),
      issues: [],
    };
  }
  if (fromJob === "bad" || fromJob === "neutral") {
    const failure = formatSoquijFailure(payload, locale);
    const fallback =
      fromJob === "neutral"
        ? locale === "fr"
          ? "Ignoré"
          : "Skipped"
        : locale === "fr"
          ? "Échec"
          : "Failed";
    return {
      key: "soquij",
      tone: fromJob === "bad" ? "bad" : "neutral",
      checkLabel,
      summary: failure?.title || fallback,
      issues: failure?.detail ? [failure.detail] : [],
    };
  }
  if (!payload) {
    return {
      key: "soquij",
      tone: status === "completed" ? "warn" : "neutral",
      checkLabel,
      summary: locale === "fr" ? "Résultat indisponible" : "No SOQUIJ result",
      issues: [],
    };
  }
  const respondents = payload.respondent_count ?? 0;
  const strong = payload.strong_match_count ?? 0;
  const issues: string[] = [];
  if (respondents > 0) {
    issues.push(
      locale === "fr"
        ? `${respondents} comme défendeur`
        : `${respondents} as respondent`
    );
  } else if (strong > 0) {
    issues.push(
      locale === "fr"
        ? `${strong} correspondance(s) forte(s)`
        : `${strong} strong match(es)`
    );
  }
  return {
    key: "soquij",
    tone: respondents > 0 ? "bad" : strong > 0 ? "warn" : "ok",
    checkLabel,
    summary: formatSoquijScreeningPreview(payload, locale),
    issues,
  };
}

export function householdAffordabilityGlance(
  snapshot: HouseholdAffordability,
  locale: Locale
): ScreeningGlanceRow {
  const checkLabel = locale === "fr" ? "Revenu vs loyer" : "Income vs rent";
  const issues: string[] = [];
  if (snapshot.ocr_monthly != null) {
    if (snapshot.ocr_note) {
      issues.push(
        locale === "fr"
          ? `Note OCR : ${snapshot.ocr_note}`
          : `Pay stub note: ${snapshot.ocr_note}`
      );
    }
    if (snapshot.declared_label && snapshot.declared_label !== "—") {
      issues.push(
        locale === "fr"
          ? `Sur le formulaire : ${snapshot.declared_label}`
          : `On the form: ${snapshot.declared_label}`
      );
    }
    return {
      key: "household",
      tone: asGlanceTone(snapshot.ocr_tone),
      checkLabel,
      summary:
        locale === "fr"
          ? `Selon les talons de paie : ${snapshot.ocr_label}`
          : `From pay stubs: ${snapshot.ocr_label}`,
      issues,
    };
  }
  if (snapshot.declared_monthly != null) {
    issues.push(
      locale === "fr"
        ? "Talons de paie : total mensuel pas encore lu"
        : "Pay stubs: no readable monthly total yet"
    );
    return {
      key: "household",
      tone: asGlanceTone(snapshot.declared_tone),
      checkLabel,
      summary:
        locale === "fr"
          ? `Sur le formulaire : ${snapshot.declared_label}`
          : `On the form: ${snapshot.declared_label}`,
      issues,
    };
  }
  return {
    key: "household",
    tone: "neutral",
    checkLabel,
    summary: locale === "fr" ? "Loyer ou revenus indisponibles" : "Rent or income unavailable",
    issues: snapshot.rent == null
      ? [locale === "fr" ? "Loyer non saisi sur l'unité" : "No rent on unit"]
      : [],
  };
}
