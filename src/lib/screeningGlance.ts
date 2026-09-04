/** Compact ID / payslip rows for the admin screening glance table. */

import type { Locale } from "./i18n";
import {
  formatIdPhotoQuality,
  incomeExtractFlagLabel,
  uniqueIncomeFlags,
  type IdDocumentExtractPayload,
  type IncomeDocumentExtractPayload,
} from "./jobMessageFormat";
import {
  isIdExtractInconclusive,
  isIncomeExtractInconclusive,
} from "./documentExtractReview";
import { nameSimilarity } from "./names";

export type GlanceTone = "ok" | "warn" | "bad" | "pending" | "neutral";

export type ScreeningGlanceRow = {
  key: "id" | "income" | "household";
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

export function idScreeningGlance(
  payload: IdDocumentExtractPayload | null,
  status: string,
  locale: Locale,
  formName?: string | null
): ScreeningGlanceRow {
  const checkLabel = locale === "fr" ? "Pièce d'identité" : "ID";
  const fromJob = jobTone(status);
  if (fromJob === "pending") {
    return { key: "id", tone: "pending", checkLabel, summary: status, issues: [] };
  }
  if (fromJob === "bad") {
    return {
      key: "id",
      tone: "bad",
      checkLabel,
      summary: locale === "fr" ? "Lecture échouée" : "Extract failed",
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
        locale === "fr" ? `${name} ≈ formulaire` : `${name} ≈ form`,
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
  const checkLabel = locale === "fr" ? "Talon de paie" : "Payslip";
  const fromJob = jobTone(status);
  if (fromJob === "pending") {
    return { key: "income", tone: "pending", checkLabel, summary: status, issues: [] };
  }
  if (fromJob === "bad") {
    return {
      key: "income",
      tone: "bad",
      checkLabel,
      summary: locale === "fr" ? "Lecture échouée" : "Extract failed",
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
  const facts: string[] = [];
  if (payload.employer_name) facts.push(payload.employer_name);
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
      locale === "fr" ? `${payload.slip_count} talons` : `${payload.slip_count} slips`
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

export function householdAffordabilityGlance(
  snapshot: HouseholdAffordability,
  locale: Locale
): ScreeningGlanceRow {
  const checkLabel = locale === "fr" ? "Ménage vs loyer" : "Household vs rent";
  const issues: string[] = [];
  if (snapshot.ocr_monthly != null) {
    if (snapshot.ocr_note) issues.push(snapshot.ocr_note);
    if (snapshot.declared_label && snapshot.declared_label !== "—") {
      issues.push(
        locale === "fr"
          ? `Déclaré : ${snapshot.declared_label}`
          : `Declared: ${snapshot.declared_label}`
      );
    }
    return {
      key: "household",
      tone: asGlanceTone(snapshot.ocr_tone),
      checkLabel,
      summary: snapshot.ocr_label,
      issues,
    };
  }
  if (snapshot.declared_monthly != null) {
    issues.push(
      locale === "fr" ? "Talons : pas encore de total OCR" : "Payslip OCR: no household total yet"
    );
    return {
      key: "household",
      tone: asGlanceTone(snapshot.declared_tone),
      checkLabel,
      summary: snapshot.declared_label,
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
