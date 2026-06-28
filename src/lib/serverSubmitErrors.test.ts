import { describe, expect, it } from "vitest";
import type { ApplyValidationInput } from "./applyValidation";
import { mapServerSubmitError } from "./serverSubmitErrors";

function baseInput(overrides: Partial<ApplyValidationInput> = {}): ApplyValidationInput {
  return {
    move_in_date: "2099-06-15",
    email: "a@example.com",
    phone: "+15145550100",
    roommates: [],
    includeGuarantor: false,
    guarantor: null,
    landlord_phone: "+15145550101",
    hr_phone: "+15145550102",
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

  it("routes address chain errors to addresses step", () => {
    const result = mapServerSubmitError(
      "Previous address must end on or before your current address start date",
      baseInput()
    );
    expect(result?.step).toBe("addresses");
    expect(result?.fieldErrors.previous_address_lived_to).toBe("address_dates_chain");
  });
});
