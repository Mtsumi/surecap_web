import { describe, expect, it } from "vitest";
import type { ApplyValidationInput } from "./applyValidation";
import { mapPydanticValidationErrors, mapServerSubmitError } from "./serverSubmitErrors";

function baseInput(overrides: Partial<ApplyValidationInput> = {}): ApplyValidationInput {
  return {
    move_in_date: "2099-06-15",
    email: "a@example.com",
    phone: "+15145550100",
    roommates: [],
    includeGuarantor: false,
    guarantor: null,
    landlord_name: "Landlord Co",
    landlord_phone: "+15145550101",
    hr_name: "HR Dept",
    hr_phone: "+15145550102",
    monthly_net_income: "4000",
    current_address: "123 Rue Example",
    current_address_lived_from: "2024-01-01",
    current_address_lived_to: "",
    still_at_current_address: true,
    previous_address: "",
    previous_address_lived_from: "",
    previous_address_lived_to: "",
    lease_in_name: true,
    ...overrides,
  };
}

describe("mapServerSubmitError", () => {
  it("routes invalid phone to references when only landlord/HR fail client check", () => {
    const result = mapServerSubmitError(
      "Invalid phone number",
      baseInput({ landlord_phone: "bad", hr_phone: "+15145550102" })
    );
    expect(result?.step).toBe("references");
    expect(result?.fieldErrors.landlord_phone).toBe("invalid_phone");
    expect(result?.messageKey).toBe("validationInvalidPhone");
  });

  it("routes invalid phone to personal for applicant phone", () => {
    const result = mapServerSubmitError(
      "Invalid phone number",
      baseInput({ phone: "12345" })
    );
    expect(result?.step).toBe("personal");
    expect(result?.fieldErrors.phone).toBe("invalid_phone");
  });

  it("routes API field-specific phone errors to the right step", () => {
    const result = mapServerSubmitError(
      "Invalid phone number (hr_phone)",
      baseInput()
    );
    expect(result?.step).toBe("references");
    expect(result?.fieldErrors.hr_phone).toBe("invalid_phone");
  });

  it("routes address chain errors to addresses step", () => {
    const result = mapServerSubmitError(
      "Previous address must end on or before your current address start date",
      baseInput()
    );
    expect(result?.step).toBe("addresses");
    expect(result?.fieldErrors.previous_address_lived_to).toBe("address_dates_chain");
  });

  it("routes move-in before unit availability to housing", () => {
    const result = mapServerSubmitError(
      "Move-in date cannot be before the unit is available (2026-08-01)",
      baseInput()
    );
    expect(result?.step).toBe("housing");
    expect(result?.fieldErrors.move_in_date).toBe("move_in_before_available");
  });

  it("routes duplicate roommate emails to housing", () => {
    const result = mapServerSubmitError(
      "Duplicate roommate emails",
      baseInput({
        roommates: [
          { email: "dup@example.com" },
          { email: "dup@example.com" },
        ],
      })
    );
    expect(result?.step).toBe("housing");
    expect(result?.fieldErrors.roommate_email_0).toBe("duplicate_email");
    expect(result?.fieldErrors.roommate_email_1).toBe("duplicate_email");
  });

  it("routes date of birth errors to personal", () => {
    expect(mapServerSubmitError("Date of birth cannot be in the future", baseInput())).toEqual({
      step: "personal",
      fieldErrors: { date_of_birth: "date_of_birth_invalid" },
      messageKey: "validationDateOfBirthInvalid",
    });
    expect(mapServerSubmitError("Applicant must be at least 18 years old", baseInput())).toEqual({
      step: "personal",
      fieldErrors: { date_of_birth: "date_of_birth_underage" },
      messageKey: "validationDateOfBirthUnderage",
    });
  });
});

describe("mapPydanticValidationErrors", () => {
  it("routes empty hr_phone to references step", () => {
    const result = mapPydanticValidationErrors(
      [
        {
          type: "string_too_short",
          loc: ["body", "hr_phone"],
          msg: "String should have at least 7 characters",
          input: "",
        },
      ],
      baseInput({ hr_phone: "" })
    );
    expect(result?.step).toBe("references");
    expect(result?.fieldErrors.hr_phone).toBe("required");
    expect(result?.messageKey).toBe("fieldRequired");
  });
});
