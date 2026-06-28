import { describe, expect, it } from "vitest";
import {
  addressDatePayload,
  formatAddressDateRange,
  toAddressValidationInput,
} from "./addressFormUtils";

describe("addressFormUtils", () => {
  const fields = {
    current_address: "123 Rue Example",
    current_address_lived_from: "2024-01-01",
    current_address_lived_to: "",
    still_at_current_address: true,
    previous_address: "10 Old St",
    previous_address_lived_from: "2020-01-01",
    previous_address_lived_to: "2023-12-31",
    lease_in_name: true,
  };

  it("addressDatePayload omits current lived_to when still living", () => {
    expect(addressDatePayload(fields)).toEqual({
      current_address_lived_from: "2024-01-01",
      current_address_lived_to: undefined,
      previous_address_lived_from: "2020-01-01",
      previous_address_lived_to: "2023-12-31",
    });
  });

  it("addressDatePayload omits previous dates when previous address empty", () => {
    expect(
      addressDatePayload({ ...fields, previous_address: "", previous_address_lived_from: "x" })
    ).toMatchObject({
      previous_address_lived_from: undefined,
      previous_address_lived_to: undefined,
    });
  });

  it("toAddressValidationInput passes lease requirement flag", () => {
    const input = toAddressValidationInput(
      { ...fields, lease_in_name: null },
      { requireLeaseInName: false }
    );
    expect(input.require_lease_in_name).toBe(false);
  });

  it("formatAddressDateRange shows still living label when to is null", () => {
    expect(formatAddressDateRange("en", "2024-01-01", null)).toContain("2024-01-01");
    expect(formatAddressDateRange("en", "2024-01-01", null).toLowerCase()).toContain("still");
  });
});
