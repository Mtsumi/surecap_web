import { describe, expect, it } from "vitest";
import {
  firstInviteeErrorKey,
  inviteeFieldErrors,
  validateInviteeEmailMatch,
  type InviteeFormFields,
} from "./inviteValidation";

function roommateFields(overrides: Partial<InviteeFormFields> = {}): InviteeFormFields {
  return {
    given_name: "Jean",
    family_name: "Tremblay",
    date_of_birth: "1995-01-01",
    email: "roommate@example.com",
    phone: "5145550100",
    current_address: "123 Rue Example, Montréal",
    current_apartment: "",
    current_place_id: "",
    address_not_in_canada: false,
    previous_address: "",
    previous_apartment: "",
    previous_place_id: "",
    current_address_lived_from: "2024-01-01",
    current_address_lived_to: "",
    still_at_current_address: true,
    previous_address_lived_from: "",
    previous_address_lived_to: "",
    lease_in_name: true,
    move_in_date: "2026-07-01",
    landlord_name: "Landlord Co",
    landlord_phone: "5145550101",
    hr_name: "HR Dept",
    hr_phone: "5145550102",
    employment_type: "employed",
    monthly_net_income: "4000",
    referral_source: "",
    facebook_url: "",
    linkedin_url: "",
    ...overrides,
  };
}

function guarantorFields(overrides: Partial<InviteeFormFields> = {}): InviteeFormFields {
  return roommateFields({
    lease_in_name: null,
    move_in_date: "",
    landlord_name: "",
    landlord_phone: "",
    ...overrides,
  });
}

describe("validateInviteeEmailMatch", () => {
  it("requires invite email and valid format", () => {
    expect(validateInviteeEmailMatch("roommate@example.com", "roommate@example.com")).toBeNull();
    expect(validateInviteeEmailMatch("roommate@example.com", "other@example.com")).toBe(
      "invite_email_mismatch"
    );
    expect(validateInviteeEmailMatch("roommate@example.com", "not-an-email")).toBe("invalid_email");
  });
});

describe("inviteeFieldErrors", () => {
  it("flags missing required roommate fields", () => {
    const errors = inviteeFieldErrors(
      "roommate",
      roommateFields({ current_address: "", landlord_name: "" }),
      "roommate@example.com"
    );
    expect(errors.current_address).toBe("required");
    expect(errors.landlord_name).toBe("required");
  });

  it("flags guarantor required fields without landlord references", () => {
    const errors = inviteeFieldErrors("guarantor", guarantorFields({ hr_name: "" }), "roommate@example.com");
    expect(errors.landlord_phone).toBeUndefined();
    expect(errors.hr_name).toBe("required");
  });

  it("requires guarantor current address lived-from", () => {
    const errors = inviteeFieldErrors(
      "guarantor",
      guarantorFields({ current_address_lived_from: "" }),
      "guarantor@example.com"
    );
    expect(errors.current_address_lived_from).toBe("address_date_required");
    expect(errors.lease_in_name).toBeUndefined();
  });

  it("flags invite email mismatch and duplicate landlord/HR phones for roommates", () => {
    const errors = inviteeFieldErrors(
      "roommate",
      roommateFields({
        email: "wrong@example.com",
        landlord_phone: "5145550100",
        hr_phone: "514-555-0100",
      }),
      "roommate@example.com"
    );
    expect(errors.email).toBe("invite_email_mismatch");
    expect(errors.landlord_phone).toBe("landlord_hr_same_phone");
    expect(errors.hr_phone).toBe("landlord_hr_same_phone");
  });

  it("firstInviteeErrorKey returns first key", () => {
    expect(firstInviteeErrorKey({ email: "required", phone: "invalid_phone" })).toBe("email");
    expect(firstInviteeErrorKey({})).toBeNull();
  });
});
