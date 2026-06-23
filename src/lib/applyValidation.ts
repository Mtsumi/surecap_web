/** Client-side apply form validation (FR/EN messages via i18n keys). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ApplyValidationCode =
  | "move_in_too_soon"
  | "invalid_email"
  | "duplicate_email"
  | "landlord_hr_same_phone";

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

function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** Earliest allowed move-in is tomorrow (applicant local calendar). */
export function isMoveInDateValid(moveIn: string): boolean {
  if (!moveIn) return false;
  return moveIn > localDateString();
}

export function validateApplyForm(input: ApplyValidationInput): ApplyValidationCode | null {
  if (!isMoveInDateValid(input.move_in_date)) {
    return "move_in_too_soon";
  }

  const emails = [input.email.trim().toLowerCase()];
  for (const roommate of input.roommates) {
    const email = roommate.email.trim();
    if (!email) continue;
    if (!isValidEmail(email)) return "invalid_email";
    emails.push(email.toLowerCase());
  }
  if (!isValidEmail(input.email)) return "invalid_email";
  if (input.includeGuarantor && input.guarantor) {
    const email = input.guarantor.email.trim();
    if (!isValidEmail(email)) return "invalid_email";
    emails.push(email.toLowerCase());
  }
  if (new Set(emails).size !== emails.length) {
    return "duplicate_email";
  }

  const landlord = normalizePhone(input.landlord_phone);
  const hr = normalizePhone(input.hr_phone);
  if (landlord && hr && landlord === hr) {
    return "landlord_hr_same_phone";
  }

  return null;
}
