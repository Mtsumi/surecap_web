/** Client-side apply form validation (FR/EN messages via i18n keys). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ApplyValidationCode =
  | "move_in_too_soon"
  | "invalid_email"
  | "duplicate_email"
  | "landlord_hr_same_phone";

export type ApplyFormStep = "personal" | "housing" | "references";

export type ApplyValidationInput = {
  move_in_date: string;
  email: string;
  roommates: { email: string }[];
  includeGuarantor: boolean;
  guarantor: { email: string } | null;
  landlord_phone: string;
  hr_phone: string;
};

function localDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** Earliest allowed move-in is tomorrow (applicant local calendar). */
export function isMoveInDateValid(moveIn: string): boolean {
  if (!moveIn) return false;
  return moveIn > localDateString();
}

export function validateEmailFormat(email: string): ApplyValidationCode | null {
  const trimmed = email.trim();
  if (!trimmed) return null;
  return isValidEmail(trimmed) ? null : "invalid_email";
}

export function validatePhones(
  landlordPhone: string,
  hrPhone: string
): ApplyValidationCode | null {
  const landlord = normalizePhone(landlordPhone);
  const hr = normalizePhone(hrPhone);
  if (landlord && hr && landlord === hr) {
    return "landlord_hr_same_phone";
  }
  return null;
}

function filledRoommateEmails(roommates: { email: string }[]): string[] {
  return roommates.map((r) => r.email.trim().toLowerCase()).filter(Boolean);
}

export function validateEmailUniqueness(
  email: string,
  otherEmails: string[]
): ApplyValidationCode | null {
  const formatError = validateEmailFormat(email);
  if (formatError) return formatError;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const others = otherEmails.map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (others.includes(normalized)) return "duplicate_email";
  return null;
}

export function otherEmailsForPrimary(
  input: ApplyValidationInput
): string[] {
  const others = filledRoommateEmails(input.roommates);
  if (input.includeGuarantor && input.guarantor?.email) {
    others.push(input.guarantor.email.trim().toLowerCase());
  }
  return others;
}

export function otherEmailsForRoommate(
  input: ApplyValidationInput,
  roommateIndex: number
): string[] {
  const others = [input.email.trim().toLowerCase()];
  input.roommates.forEach((roommate, index) => {
    if (index === roommateIndex) return;
    const email = roommate.email.trim().toLowerCase();
    if (email) others.push(email);
  });
  if (input.includeGuarantor && input.guarantor?.email) {
    others.push(input.guarantor.email.trim().toLowerCase());
  }
  return others;
}

export function otherEmailsForGuarantor(input: ApplyValidationInput): string[] {
  const others = [input.email.trim().toLowerCase(), ...filledRoommateEmails(input.roommates)];
  return others;
}

export function validatePersonalStep(email: string): ApplyValidationCode | null {
  return validateEmailFormat(email);
}

export function validateHousingStep(
  input: Pick<
    ApplyValidationInput,
    "move_in_date" | "email" | "roommates" | "includeGuarantor" | "guarantor"
  >
): ApplyValidationCode | null {
  if (!isMoveInDateValid(input.move_in_date)) {
    return "move_in_too_soon";
  }

  const primaryError = validateEmailFormat(input.email);
  if (primaryError) return primaryError;

  const emails = [input.email.trim().toLowerCase()];
  for (const roommate of input.roommates) {
    const email = roommate.email.trim();
    if (!email) continue;
    if (!isValidEmail(email)) return "invalid_email";
    emails.push(email.toLowerCase());
  }
  if (input.includeGuarantor && input.guarantor) {
    const email = input.guarantor.email.trim();
    if (!isValidEmail(email)) return "invalid_email";
    emails.push(email.toLowerCase());
  }
  if (new Set(emails).size !== emails.length) {
    return "duplicate_email";
  }

  return null;
}

export function validateReferencesStep(
  landlordPhone: string,
  hrPhone: string
): ApplyValidationCode | null {
  return validatePhones(landlordPhone, hrPhone);
}

export function stepForValidationCode(code: ApplyValidationCode): ApplyFormStep {
  switch (code) {
    case "move_in_too_soon":
    case "invalid_email":
    case "duplicate_email":
      return "housing";
    case "landlord_hr_same_phone":
      return "references";
    default:
      return "personal";
  }
}

export function findFirstValidationIssue(
  input: ApplyValidationInput
): { code: ApplyValidationCode; step: ApplyFormStep } | null {
  const personal = validatePersonalStep(input.email);
  if (personal) return { code: personal, step: "personal" };

  const housing = validateHousingStep(input);
  if (housing) return { code: housing, step: "housing" };

  const references = validateReferencesStep(input.landlord_phone, input.hr_phone);
  if (references) return { code: references, step: "references" };

  return null;
}

export function validateApplyForm(input: ApplyValidationInput): ApplyValidationCode | null {
  return findFirstValidationIssue(input)?.code ?? null;
}
