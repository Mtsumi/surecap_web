/** Client-side validation for invitee apply forms. */

import {
  ApplyValidationCode,
  addressFieldErrors,
  validateEmailFormat,
  validatePhoneFormat,
  validatePhones,
} from "./applyValidation";
import { toAddressValidationInput } from "./addressFormUtils";

export type InviteeRole = "roommate" | "guarantor";

export type InviteeFormFields = {
  given_name: string;
  family_name: string;
  date_of_birth: string;
  email: string;
  phone: string;
  current_address: string;
  current_place_id: string;
  address_not_in_canada: boolean;
  previous_address: string;
  previous_place_id: string;
  current_address_lived_from: string;
  current_address_lived_to: string;
  still_at_current_address: boolean;
  previous_address_lived_from: string;
  previous_address_lived_to: string;
  lease_in_name: boolean | null;
  move_in_date: string;
  landlord_name: string;
  landlord_phone: string;
  hr_name: string;
  hr_phone: string;
  referral_source: string;
  facebook_url: string;
  linkedin_url: string;
};

export type InviteeFieldErrors = Partial<
  Record<string, ApplyValidationCode | "required" | "invite_email_mismatch">
>;

const ROOMMATE_REQUIRED: (keyof InviteeFormFields)[] = [
  "given_name",
  "family_name",
  "date_of_birth",
  "email",
  "phone",
  "move_in_date",
  "landlord_name",
  "landlord_phone",
  "hr_name",
  "hr_phone",
];

const GUARANTOR_REQUIRED: (keyof InviteeFormFields)[] = [
  "given_name",
  "family_name",
  "date_of_birth",
  "email",
  "phone",
  "hr_name",
  "hr_phone",
];

export function validateInviteeEmailMatch(
  invitedEmail: string,
  email: string
): ApplyValidationCode | "invite_email_mismatch" | null {
  const formatError = validateEmailFormat(email);
  if (formatError) return formatError;
  if (invitedEmail.trim().toLowerCase() !== email.trim().toLowerCase()) {
    return "invite_email_mismatch";
  }
  return null;
}

export function inviteeFieldErrors(
  role: InviteeRole,
  fields: InviteeFormFields,
  invitedEmail: string
): InviteeFieldErrors {
  const errors: InviteeFieldErrors = {};
  const required = role === "guarantor" ? GUARANTOR_REQUIRED : ROOMMATE_REQUIRED;

  for (const key of required) {
    const value = fields[key];
    if (value === null || value === undefined || String(value).trim() === "") {
      errors[key] = "required";
    }
  }

  const emailError = validateInviteeEmailMatch(invitedEmail, fields.email);
  if (emailError) errors.email = emailError;

  const phoneFields: (keyof InviteeFormFields)[] =
    role === "guarantor"
      ? ["phone", "hr_phone"]
      : ["phone", "landlord_phone", "hr_phone"];
  for (const key of phoneFields) {
    const formatError = validatePhoneFormat(String(fields[key]));
    if (formatError) errors[key] = formatError;
  }

  if (role === "roommate") {
    const phoneError = validatePhones(fields.landlord_phone, fields.hr_phone);
    if (phoneError) {
      errors.landlord_phone = phoneError;
      errors.hr_phone = phoneError;
    }
  }

  Object.assign(
    errors,
    addressFieldErrors(
      toAddressValidationInput(fields, { requireLeaseInName: role === "roommate" })
    )
  );

  return errors;
}

export function firstInviteeErrorKey(errors: InviteeFieldErrors): string | null {
  const keys = Object.keys(errors);
  return keys.length ? keys[0] : null;
}
