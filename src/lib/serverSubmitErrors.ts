import {
  ApplyFieldErrors,
  ApplyFormStep,
  ApplyValidationInput,
  addressFieldErrors,
  housingFieldErrors,
  validatePhoneFormat,
  validatePhones,
} from "./applyValidation";
import type { ApiValidationErrorItem } from "./api";
import { ApiError } from "./api";
import { toAddressValidationInput } from "./addressFormUtils";
import type { InviteeFieldErrors, InviteeFormFields, InviteeRole } from "./inviteValidation";
import type { MessageKey } from "./i18n";

export type InviteFormStep = "personal" | "addresses" | "references";

export type ServerSubmitErrorResult = {
  step: ApplyFormStep;
  fieldErrors: ApplyFieldErrors;
  messageKey: MessageKey;
};

export type InviteServerSubmitErrorResult = {
  step: InviteFormStep;
  fieldErrors: InviteeFieldErrors;
  messageKey: MessageKey;
};

function roommateDuplicateFieldErrors(
  roommates: { email: string }[]
): ApplyFieldErrors {
  const errors: ApplyFieldErrors = {};
  const seen = new Map<string, number[]>();
  roommates.forEach((roommate, index) => {
    const normalized = roommate.email.trim().toLowerCase();
    if (!normalized) return;
    const indices = seen.get(normalized) ?? [];
    indices.push(index);
    seen.set(normalized, indices);
  });
  for (const indices of Array.from(seen.values())) {
    if (indices.length > 1) {
      for (const index of indices) {
        errors[`roommate_email_${index}`] = "duplicate_email";
      }
    }
  }
  return errors;
}

function inviteToValidationInput(
  role: InviteeRole,
  form: InviteeFormFields
): ApplyValidationInput {
  return {
    move_in_date: form.move_in_date,
    email: form.email,
    phone: form.phone,
    roommates: [],
    includeGuarantor: false,
    guarantor: null,
    landlord_phone: form.landlord_phone,
    landlord_name: form.landlord_name,
    hr_phone: form.hr_phone,
    hr_name: form.hr_name,
    monthly_net_income: form.monthly_net_income,
    ...toAddressValidationInput(form, { requireLeaseInName: role === "roommate" }),
  };
}

function applyStepToInviteStep(
  step: ApplyFormStep,
  role: InviteeRole,
  fieldErrors: ApplyFieldErrors
): InviteFormStep {
  if (step === "other") {
    return "references";
  }
  if (step === "housing") {
    if (role === "guarantor") return "personal";
    if (fieldErrors.lease_in_name) return "addresses";
    return "personal";
  }
  return step;
}

const PYDANTIC_FIELD_STEP: Record<string, ApplyFormStep> = {
  given_name: "personal",
  family_name: "personal",
  date_of_birth: "personal",
  email: "personal",
  phone: "personal",
  current_address: "addresses",
  current_place_id: "addresses",
  address_not_in_canada: "addresses",
  previous_address: "addresses",
  previous_place_id: "addresses",
  current_address_lived_from: "addresses",
  current_address_lived_to: "addresses",
  previous_address_lived_from: "addresses",
  previous_address_lived_to: "addresses",
  lease_in_name: "housing",
  move_in_date: "housing",
  renting_with_others: "housing",
  roommates: "housing",
  guarantor: "housing",
  employment_type: "references",
  monthly_net_income: "references",
  landlord_name: "references",
  landlord_phone: "references",
  hr_name: "references",
  hr_phone: "references",
  referral_source: "other",
  facebook_url: "other",
  linkedin_url: "other",
};

function pydanticFieldName(loc: (string | number)[]): string | null {
  const bodyIndex = loc.indexOf("body");
  if (bodyIndex < 0) return null;
  const field = loc[bodyIndex + 1];
  return typeof field === "string" ? field : null;
}

function pydanticFieldErrorCode(
  item: ApiValidationErrorItem,
  field: string
): ApplyFieldErrors[string] {
  if (item.type === "missing" || item.type === "string_too_short") {
    return "required";
  }
  if (field.includes("phone")) {
    return "invalid_phone";
  }
  if (field === "email") {
    return "invalid_email";
  }
  return "required";
}

/** Map FastAPI/Pydantic 422 field errors to form step + field highlights. */
export function mapPydanticValidationErrors(
  errors: ApiValidationErrorItem[],
  input: ApplyValidationInput
): ServerSubmitErrorResult | null {
  const fieldErrors: ApplyFieldErrors = {};
  let step: ApplyFormStep = "personal";

  for (const item of errors) {
    const field = pydanticFieldName(item.loc);
    if (!field) continue;
    fieldErrors[field] = pydanticFieldErrorCode(item, field);
    step = PYDANTIC_FIELD_STEP[field] ?? step;
  }

  if (Object.keys(fieldErrors).length === 0) {
    return null;
  }

  const firstField = Object.keys(fieldErrors)[0];
  step = PYDANTIC_FIELD_STEP[firstField] ?? step;

  const messageKey =
    fieldErrors[firstField] === "invalid_phone"
      ? "validationInvalidPhone"
      : fieldErrors[firstField] === "invalid_email"
        ? "validationInvalidEmail"
        : fieldErrors[firstField] === "landlord_hr_same_phone"
          ? "validationLandlordHrSamePhone"
          : "fieldRequired";

  // Re-run client rules when phones are present so same-phone check still applies.
  if (step === "references" && !fieldErrors.landlord_phone && !fieldErrors.hr_phone) {
    const phoneError = validatePhones(input.landlord_phone, input.hr_phone);
    if (phoneError) {
      fieldErrors.landlord_phone = phoneError;
      fieldErrors.hr_phone = phoneError;
      return {
        step,
        fieldErrors,
        messageKey: "validationLandlordHrSamePhone",
      };
    }
  }

  return { step, fieldErrors, messageKey };
}

/** Map API submit error messages to form step + field highlights. */
export function mapServerSubmitError(
  message: string,
  input: ApplyValidationInput
): ServerSubmitErrorResult | null {
  const trimmed = message.trim();

  if (trimmed === "Invalid phone number") {
    const fieldErrors: ApplyFieldErrors = {};
    const applicant = validatePhoneFormat(input.phone);
    if (applicant) fieldErrors.phone = applicant;
    const landlord = validatePhoneFormat(input.landlord_phone);
    if (landlord) fieldErrors.landlord_phone = landlord;
    const hr = validatePhoneFormat(input.hr_phone);
    if (hr) fieldErrors.hr_phone = hr;
    if (input.includeGuarantor && input.guarantor?.phone) {
      const guarantor = validatePhoneFormat(input.guarantor.phone);
      if (guarantor) fieldErrors.guarantor_phone = guarantor;
    }
    if (Object.keys(fieldErrors).length === 0) {
      fieldErrors.phone = "invalid_phone";
      fieldErrors.landlord_phone = "invalid_phone";
      fieldErrors.hr_phone = "invalid_phone";
      if (input.includeGuarantor) fieldErrors.guarantor_phone = "invalid_phone";
    }
    const step: ApplyFormStep = fieldErrors.phone
      ? "personal"
      : fieldErrors.guarantor_phone
        ? "housing"
        : "references";
    return { step, fieldErrors, messageKey: "validationInvalidPhone" };
  }

  if (trimmed === "Landlord and employer phone numbers must be different") {
    const code = validatePhones(input.landlord_phone, input.hr_phone);
    return {
      step: "references",
      fieldErrors: code
        ? { landlord_phone: code, hr_phone: code }
        : {},
      messageKey: "validationLandlordHrSamePhone",
    };
  }

  if (trimmed === "Move-in date must be tomorrow or later") {
    return {
      step: "housing",
      fieldErrors: { move_in_date: "move_in_too_soon" },
      messageKey: "validationMoveInTooSoon",
    };
  }

  if (trimmed.startsWith("Move-in date cannot be before the unit is available")) {
    return {
      step: "housing",
      fieldErrors: { move_in_date: "move_in_before_available" },
      messageKey: "validationMoveInBeforeAvailable",
    };
  }

  if (trimmed === "Duplicate roommate emails") {
    return {
      step: "housing",
      fieldErrors: roommateDuplicateFieldErrors(input.roommates),
      messageKey: "validationDuplicateEmail",
    };
  }

  if (trimmed === "This email is already used on this application") {
    return {
      step: "housing",
      fieldErrors: housingFieldErrors(input),
      messageKey: "validationDuplicateEmail",
    };
  }

  if (trimmed.startsWith("Missing required fields:")) {
    return {
      step: "personal",
      fieldErrors: {},
      messageKey: "fieldRequired",
    };
  }

  if (trimmed === "Current address move-in date is required") {
    return {
      step: "addresses",
      fieldErrors: { current_address_lived_from: "address_date_required" },
      messageKey: "validationAddressDateRequired",
    };
  }

  if (trimmed === "Previous address dates are required") {
    return {
      step: "addresses",
      fieldErrors: {
        previous_address_lived_from: "address_date_required",
        previous_address_lived_to: "address_date_required",
      },
      messageKey: "validationAddressDateRequired",
    };
  }

  if (
    trimmed === "Previous address must end on or before your current address start date"
  ) {
    return {
      step: "addresses",
      fieldErrors: { previous_address_lived_to: "address_dates_chain" },
      messageKey: "validationAddressDatesChain",
    };
  }

  if (trimmed === "Invalid address date range") {
    return {
      step: "addresses",
      fieldErrors: addressFieldErrors(input),
      messageKey: "validationInvalidAddressDateRange",
    };
  }

  if (trimmed === "Each person must have a different email address") {
    return {
      step: "housing",
      fieldErrors: {},
      messageKey: "validationDuplicateEmail",
    };
  }

  if (trimmed.startsWith("Missing required income document")) {
    return {
      step: "references",
      fieldErrors: {},
      messageKey: "incomeUploadRequired",
    };
  }

  if (trimmed.startsWith("Missing required ID document")) {
    return {
      step: "personal",
      fieldErrors: {},
      messageKey: "idUploadRequired",
    };
  }

  return null;
}

export function mapSubmitError(
  err: unknown,
  input: ApplyValidationInput
): ServerSubmitErrorResult | null {
  if (err instanceof ApiError && err.validationErrors.length > 0) {
    const mapped = mapPydanticValidationErrors(err.validationErrors, input);
    if (mapped) return mapped;
  }
  const message = err instanceof Error ? err.message : "";
  return mapServerSubmitError(message, input);
}

export function mapInviteServerSubmitError(
  err: unknown,
  role: InviteeRole,
  form: InviteeFormFields
): InviteServerSubmitErrorResult | null {
  const message = err instanceof Error ? err.message : "";

  if (message.trim() === "Email must match the address used for your invitation") {
    return {
      step: "personal",
      fieldErrors: { email: "invite_email_mismatch" },
      messageKey: "validationInviteEmailMismatch",
    };
  }

  const mapped = mapSubmitError(err, inviteToValidationInput(role, form));
  if (!mapped) return null;
  return {
    step: applyStepToInviteStep(mapped.step, role, mapped.fieldErrors),
    fieldErrors: mapped.fieldErrors,
    messageKey: mapped.messageKey,
  };
}
