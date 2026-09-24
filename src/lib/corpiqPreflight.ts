import type { ApplicationMember } from "./adminApi";
import { hasCanadianPostal } from "./canadianPostal";
import type { Locale } from "./i18n";
import { talReasonLabel } from "./jobMessageFormat";

const CREDIT_CONSENT_TYPE = "credit_consent";
const LEADING_CIVIC = /^\s*(\d{1,6})\s+(.*)$/;

/** Issue codes aligned with backend `CorpiqPreflightError` / dry-run gates. */
export type CorpiqPreflightCode =
  | "missing_name"
  | "missing_dob"
  | "missing_consent"
  | "empty_address"
  | "missing_postal_code"
  | "missing_civic_number"
  | "missing_street";

export function corpiqAddressIssueCodes(rawAddress: string | null | undefined): CorpiqPreflightCode[] {
  const raw = (rawAddress || "").trim();
  if (!raw) return ["empty_address"];
  const issues: CorpiqPreflightCode[] = [];
  if (!hasCanadianPostal(raw)) issues.push("missing_postal_code");
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (!parts.length) {
    if (!issues.includes("empty_address")) issues.push("empty_address");
    return issues;
  }
  const civicMatch = LEADING_CIVIC.exec(parts[0]);
  if (!civicMatch) issues.push("missing_civic_number");
  else if (!civicMatch[2].trim()) issues.push("missing_street");
  return issues;
}

export function hasCreditConsentDocument(member: ApplicationMember | undefined): boolean {
  return Boolean(
    member?.documents?.some((d) => d.document_type === CREDIT_CONSENT_TYPE)
  );
}

/** Portal run (dry-run / live) requirements — same gates as the worker before Playwright. */
export function corpiqPortalPreflightIssues(
  member: ApplicationMember | undefined
): CorpiqPreflightCode[] {
  if (!member) return ["missing_name"];
  const issues: CorpiqPreflightCode[] = [];
  const given = (member.given_name || "").trim();
  const family = (member.family_name || "").trim();
  if (!given || !family) issues.push("missing_name");
  if (!member.date_of_birth) issues.push("missing_dob");
  if (!hasCreditConsentDocument(member)) issues.push("missing_consent");
  for (const code of corpiqAddressIssueCodes(member.current_address)) {
    if (!issues.includes(code)) issues.push(code);
  }
  return issues;
}

export function corpiqPreflightOk(member: ApplicationMember | undefined): boolean {
  return corpiqPortalPreflightIssues(member).length === 0;
}

export function corpiqPreflightLabel(code: CorpiqPreflightCode, locale: Locale): string {
  if (locale === "fr") {
    switch (code) {
      case "missing_name":
        return "Prénom et nom requis";
      case "missing_dob":
        return "Date de naissance manquante";
      case "missing_consent":
        return "Formulaire de crédit signé manquant";
      case "missing_street":
        return "Adresse incomplète: nom de rue manquant";
      default:
        break;
    }
  } else {
    switch (code) {
      case "missing_name":
        return "Given name and family name required";
      case "missing_dob":
        return "Date of birth missing";
      case "missing_consent":
        return "Signed credit consent form missing";
      case "missing_street":
        return "Incomplete address: street name missing";
      default:
        break;
    }
  }
  const tal = talReasonLabel(
    code === "missing_postal_code" || code === "missing_civic_number" || code === "empty_address"
      ? code
      : undefined,
    "current_address",
    locale
  );
  return tal || code;
}
