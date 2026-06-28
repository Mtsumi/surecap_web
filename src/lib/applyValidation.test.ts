import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  earliestMoveInDate,
  findFirstValidationIssue,
  housingFieldErrors,
  isImmediateAvailability,
  isMoveInDateValid,
  isValidEmail,
  moveInValidationCode,
  otherEmailsForGuarantor,
  otherEmailsForPrimary,
  otherEmailsForRoommate,
  parseUnitAvailableDate,
  personalFieldErrors,
  referencesFieldErrors,
  stepForValidationCode,
  unitEarliestMoveIn,
  validateApplyForm,
  validateEmailFormat,
  validateEmailUniqueness,
  validateHousingStep,
  validatePhoneFormat,
  validatePhones,
  validateReferencesStep,
  addressFieldErrors,
  type ApplyValidationInput,
} from "./applyValidation";

function baseInput(overrides: Partial<ApplyValidationInput> = {}): ApplyValidationInput {
  return {
    move_in_date: "2099-06-15",
    unit_earliest_move_in: "2026-06-04",
    unit_available_date: null,
    email: "primary@example.com",
    roommates: [],
    includeGuarantor: false,
    guarantor: null,
    phone: "5145550100",
    landlord_phone: "5145550101",
    hr_phone: "5145550102",
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

describe("isImmediateAvailability", () => {
  it("recognizes immediate availability phrases", () => {
    expect(isImmediateAvailability("immédiatement")).toBe(true);
    expect(isImmediateAvailability("IMMEDIATELY")).toBe(true);
    expect(isImmediateAvailability("now")).toBe(true);
    expect(isImmediateAvailability("ASAP")).toBe(true);
  });

  it("returns false for dated inventory", () => {
    expect(isImmediateAvailability("2026-07-01")).toBe(false);
    expect(isImmediateAvailability("")).toBe(false);
  });
});

describe("parseUnitAvailableDate", () => {
  it("parses ISO dates and ignores immediate strings", () => {
    expect(parseUnitAvailableDate("2026-08-01")).toBe("2026-08-01");
    expect(parseUnitAvailableDate("immédiatement")).toBeNull();
    expect(parseUnitAvailableDate("soon")).toBeNull();
  });
});

describe("move-in date rules", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("earliest move-in is tomorrow when unit is immediately available", () => {
    expect(earliestMoveInDate("immédiatement")).toBe("2026-06-04");
    expect(unitEarliestMoveIn({ available_date: "immédiatement" })).toBe("2026-06-04");
  });

  it("earliest move-in is later of tomorrow and unit available date", () => {
    expect(earliestMoveInDate("2026-06-10")).toBe("2026-06-10");
    expect(unitEarliestMoveIn({ earliest_move_in_date: "2026-06-12" })).toBe("2026-06-12");
  });

  it("rejects today and accepts valid future dates", () => {
    expect(isMoveInDateValid("2026-06-03", { available_date: "immédiatement" })).toBe(false);
    expect(isMoveInDateValid("2026-06-04", { available_date: "immédiatement" })).toBe(true);
    expect(moveInValidationCode("2026-06-03", { available_date: "immédiatement" })).toBe(
      "move_in_too_soon"
    );
  });

  it("flags move-in before a future unit available date", () => {
    const unit = { available_date: "2026-06-10" };
    expect(moveInValidationCode("2026-06-05", unit)).toBe("move_in_before_available");
    expect(moveInValidationCode("2026-06-10", unit)).toBeNull();
  });
});

describe("email validation", () => {
  it("validates email format", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(validateEmailFormat("bad-email")).toBe("invalid_email");
    expect(validateEmailFormat("")).toBeNull();
  });

  it("detects duplicate emails", () => {
    expect(validateEmailUniqueness("a@b.com", ["a@b.com"])).toBe("duplicate_email");
    expect(validateEmailUniqueness("a@b.com", ["c@d.com"])).toBeNull();
  });

  it("collects other emails for household members", () => {
    const input = baseInput({
      roommates: [{ email: "roommate@example.com" }],
      includeGuarantor: true,
      guarantor: { email: "guarantor@example.com", phone: "5145550199" },
    });
    expect(otherEmailsForPrimary(input)).toEqual([
      "roommate@example.com",
      "guarantor@example.com",
    ]);
    expect(otherEmailsForRoommate(input, 0)).toContain("primary@example.com");
    expect(otherEmailsForGuarantor(input)).toContain("roommate@example.com");
  });
});

describe("phone validation", () => {
  it("rejects invalid numbers and accepts CA and international formats", () => {
    expect(validatePhoneFormat("call-me")).toBe("invalid_phone");
    expect(validatePhoneFormat("12345")).toBe("invalid_phone");
    expect(validatePhoneFormat("+14165550123")).toBeNull();
    expect(validatePhoneFormat("5145550101")).toBeNull();
    expect(validatePhoneFormat("+254712531490")).toBeNull();
  });

  it("rejects identical landlord and HR phones", () => {
    expect(validatePhones("5145550100", "514-555-0100")).toBe("landlord_hr_same_phone");
    expect(validatePhones("5145550101", "5145550102")).toBeNull();
  });
});

describe("address date validation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("requires current lived-from and accepts still living here", () => {
    expect(
      addressFieldErrors({
        ...baseInput(),
        current_address_lived_from: "",
      }).current_address_lived_from
    ).toBe("address_date_required");
    expect(addressFieldErrors(baseInput())).toEqual({});
  });

  it("rejects overlapping previous and current dates", () => {
    const errors = addressFieldErrors(
      baseInput({
        previous_address: "10 Old St",
        previous_address_lived_from: "2022-01-01",
        previous_address_lived_to: "2024-06-01",
        current_address_lived_from: "2024-01-01",
        still_at_current_address: true,
      })
    );
    expect(errors.previous_address_lived_to).toBe("address_dates_chain");
  });

  it("allows same-day move between addresses", () => {
    const errors = addressFieldErrors(
      baseInput({
        previous_address: "10 Old St",
        previous_address_lived_from: "2022-01-01",
        previous_address_lived_to: "2024-01-01",
        current_address_lived_from: "2024-01-01",
        still_at_current_address: true,
      })
    );
    expect(errors.previous_address_lived_to).toBeUndefined();
  });
});

describe("step validators", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("validateHousingStep catches move-in and duplicate roommate emails", () => {
    expect(
      validateHousingStep({
        move_in_date: "2026-06-03",
        unit_earliest_move_in: "2026-06-04",
        unit_available_date: null,
        email: "primary@example.com",
        roommates: [{ email: "primary@example.com" }],
        includeGuarantor: false,
        guarantor: null,
      })
    ).toBe("move_in_too_soon");

    expect(
      validateHousingStep({
        move_in_date: "2026-06-04",
        unit_earliest_move_in: "2026-06-04",
        unit_available_date: null,
        email: "primary@example.com",
        roommates: [{ email: "primary@example.com" }],
        includeGuarantor: false,
        guarantor: null,
      })
    ).toBe("duplicate_email");
  });

  it("validateReferencesStep delegates to phone rules", () => {
    expect(validateReferencesStep("5145550100", "5145550100")).toBe("landlord_hr_same_phone");
  });

  it("findFirstValidationIssue returns first failing step", () => {
    const issue = findFirstValidationIssue(
      baseInput({ email: "not-an-email", move_in_date: "2099-06-15" })
    );
    expect(issue).toEqual({ code: "invalid_email", step: "personal" });

    const phoneIssue = findFirstValidationIssue(baseInput({ phone: "12345" }));
    expect(phoneIssue).toEqual({ code: "invalid_phone", step: "personal" });

    const housingIssue = findFirstValidationIssue(
      baseInput({ move_in_date: "2026-06-03", landlord_phone: "5145550100", hr_phone: "5145550100" })
    );
    expect(housingIssue?.step).toBe("housing");
    expect(validateApplyForm(baseInput({ landlord_phone: "5145550100", hr_phone: "5145550100" }))).toBe(
      "landlord_hr_same_phone"
    );
  });

  it("maps validation codes to form steps", () => {
    expect(stepForValidationCode("duplicate_email")).toBe("housing");
    expect(stepForValidationCode("landlord_hr_same_phone")).toBe("references");
  });
});

describe("field error maps", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("housingFieldErrors marks duplicate roommate and guarantor emails", () => {
    const errors = housingFieldErrors({
      move_in_date: "2026-06-04",
      unit_earliest_move_in: "2026-06-04",
      unit_available_date: null,
      email: "dup@example.com",
      roommates: [{ email: "dup@example.com" }],
      includeGuarantor: true,
      guarantor: { email: "guarantor@example.com", phone: "bad" },
      phone: "5145550100",
    });
    expect(errors.email).toBe("duplicate_email");
    expect(errors.roommate_email_0).toBe("duplicate_email");
    expect(errors.guarantor_phone).toBe("invalid_phone");
  });

  it("personalFieldErrors and referencesFieldErrors surface field keys", () => {
    expect(personalFieldErrors("bad", "123")).toEqual({
      email: "invalid_email",
      phone: "invalid_phone",
    });
    expect(referencesFieldErrors("5145550100", "5145550100")).toEqual({
      landlord_phone: "landlord_hr_same_phone",
      hr_phone: "landlord_hr_same_phone",
    });
  });
});
