import {
  ApplyFieldErrors,
  ApplyFormStep,
  ApplyValidationInput,
  addressFieldErrors,
  housingFieldErrors,
  validatePhoneFormat,
  validatePhones,
} from "./applyValidation";
import { toAddressValidationInput } from "./addressFormUtils";
import type { InviteeFieldErrors, InviteeFormFields, InviteeRole } from "./inviteValidation";
import type { MessageKey } from "./i18n";

export type InviteFormStep = "personal" | "addresses" | "housing" | "references";

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
    hr_phone: form.hr_phone,
    ...toAddressValidationInput(form, { requireLeaseInName: role === "roommate" }),
  };
}

function applyStepToInviteStep(
  step: ApplyFormStep,
  role: InviteeRole,
  fieldErrors: ApplyFieldErrors
): InviteFormStep {
  if (step === "housing") {
    if (role === "guarantor") return "personal";
    if (fieldErrors.move_in_date) return "housing";
    if (fieldErrors.lease_in_name) return "addresses";
    return "housing";
  }
  return step;
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

  return null;
}

export function mapInviteServerSubmitError(
  message: string,
  role: InviteeRole,
  form: InviteeFormFields
): InviteServerSubmitErrorResult | null {
  const trimmed = message.trim();

  if (trimmed === "Email must match the address used for your invitation") {
    return {
      step: "personal",
      fieldErrors: { email: "invite_email_mismatch" },
      messageKey: "validationInviteEmailMismatch",
    };
  }

  const mapped = mapServerSubmitError(message, inviteToValidationInput(role, form));
  if (!mapped) return null;
  return {
    step: applyStepToInviteStep(mapped.step, role, mapped.fieldErrors),
    fieldErrors: mapped.fieldErrors,
    messageKey: mapped.messageKey,
  };
}
