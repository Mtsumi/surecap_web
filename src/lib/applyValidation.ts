/** Client-side apply form validation (FR/EN messages via i18n keys). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ApplyValidationCode =
  | "move_in_too_soon"
  | "move_in_before_available"
  | "invalid_email"
  | "duplicate_email"
  | "landlord_hr_same_phone";

export type ApplyFormStep = "personal" | "housing" | "references";

export type ApplyValidationInput = {
  move_in_date: string;
  unit_earliest_move_in?: string | null;
  unit_available_date?: string | null;
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

function tomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Inventory strings meaning no future availability floor (e.g. Excel “immédiatement”). */
export function isImmediateAvailability(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return false;
  const normalized = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (
    normalized === "immediatement" ||
    normalized === "immediately" ||
    normalized === "immediate" ||
    normalized === "maintenant" ||
    normalized === "now" ||
    normalized === "asap"
  ) {
    return true;
  }
  return normalized.includes("immediatement") || normalized.includes("immediately");
}

/** Parse inventory available_date when stored as YYYY-MM-DD. */
export function parseUnitAvailableDate(raw: string | null | undefined): string | null {
  if (!raw?.trim() || isImmediateAvailability(raw)) return null;
  const text = raw.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

export type MoveInUnitContext = {
  earliest_move_in_date?: string | null;
  available_date?: string | null;
};

/** Prefer API-computed earliest_move_in_date; fall back to client parse of available_date. */
export function unitEarliestMoveIn(unit: MoveInUnitContext | null | undefined): string {
  if (unit?.earliest_move_in_date) return unit.earliest_move_in_date;
  return earliestMoveInDate(unit?.available_date ?? null);
}

/** Earliest allowed move-in: max(tomorrow, unit available date). */
export function earliestMoveInDate(availableDate?: string | null): string {
  const tomorrow = tomorrowDateString();
  const parsed = parseUnitAvailableDate(availableDate ?? null);
  if (!parsed) return tomorrow;
  return parsed > tomorrow ? parsed : tomorrow;
}

export function moveInValidationCode(
  moveIn: string,
  unit: MoveInUnitContext | null | undefined
): ApplyValidationCode | null {
  if (!moveIn) return null;
  const earliest = unitEarliestMoveIn(unit);
  if (moveIn >= earliest) return null;
  const parsed = parseUnitAvailableDate(unit?.available_date ?? null);
  if (parsed && parsed > localDateString()) {
    return "move_in_before_available";
  }
  return "move_in_too_soon";
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** Earliest allowed move-in is tomorrow, or unit available date when later. */
export function isMoveInDateValid(
  moveIn: string,
  unit: MoveInUnitContext | null | undefined
): boolean {
  if (!moveIn) return false;
  return moveIn >= unitEarliestMoveIn(unit);
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
    | "move_in_date"
    | "unit_earliest_move_in"
    | "unit_available_date"
    | "email"
    | "roommates"
    | "includeGuarantor"
    | "guarantor"
  >
): ApplyValidationCode | null {
  const moveInError = moveInValidationCode(input.move_in_date, {
    earliest_move_in_date: input.unit_earliest_move_in,
    available_date: input.unit_available_date,
  });
  if (moveInError) return moveInError;

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
    case "move_in_before_available":
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

export type ApplyFieldErrors = Partial<Record<string, ApplyValidationCode>>;

/** Mark every housing field that fails validation (for Continue + mobile). */
export function housingFieldErrors(
  input: Pick<
    ApplyValidationInput,
    | "move_in_date"
    | "unit_earliest_move_in"
    | "unit_available_date"
    | "email"
    | "roommates"
    | "includeGuarantor"
    | "guarantor"
  >
): ApplyFieldErrors {
  const errors: ApplyFieldErrors = {};

  if (input.move_in_date) {
    const moveInError = moveInValidationCode(input.move_in_date, {
      earliest_move_in_date: input.unit_earliest_move_in,
      available_date: input.unit_available_date,
    });
    if (moveInError) errors.move_in_date = moveInError;
  }

  const emailFields: { key: string; email: string }[] = [
    { key: "email", email: input.email },
  ];
  input.roommates.forEach((roommate, index) => {
    emailFields.push({ key: `roommate_email_${index}`, email: roommate.email });
  });
  if (input.includeGuarantor && input.guarantor) {
    emailFields.push({ key: "guarantor_email", email: input.guarantor.email });
  }

  const seen = new Map<string, string[]>();
  for (const { key, email } of emailFields) {
    const trimmed = email.trim();
    if (!trimmed) continue;
    if (!isValidEmail(trimmed)) {
      errors[key] = "invalid_email";
      continue;
    }
    const normalized = trimmed.toLowerCase();
    const keys = seen.get(normalized) ?? [];
    keys.push(key);
    seen.set(normalized, keys);
  }
  for (const keys of Array.from(seen.values())) {
    if (keys.length > 1) {
      for (const key of keys) {
        errors[key] = "duplicate_email";
      }
    }
  }

  return errors;
}

export function referencesFieldErrors(
  landlordPhone: string,
  hrPhone: string
): ApplyFieldErrors {
  const code = validatePhones(landlordPhone, hrPhone);
  if (!code) return {};
  return { landlord_phone: code, hr_phone: code };
}

export function personalFieldErrors(email: string): ApplyFieldErrors {
  const code = validatePersonalStep(email);
  return code ? { email: code } : {};
}

export function firstFieldErrorKey(errors: ApplyFieldErrors): string | null {
  const keys = Object.keys(errors);
  return keys.length ? keys[0] : null;
}

export function firstFieldErrorCode(errors: ApplyFieldErrors): ApplyValidationCode | null {
  const key = firstFieldErrorKey(errors);
  return key ? errors[key] ?? null : null;
}
