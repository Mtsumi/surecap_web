import { describe, expect, it } from "vitest";
import {
  formattedAddressWithPostal,
  hasCanadianPostal,
  isPickedCanadianAddress,
} from "./canadianPostal";

describe("canadianPostal", () => {
  it("detects a Canadian postal in free text", () => {
    expect(hasCanadianPostal("3400 avenue Linton")).toBe(false);
    expect(hasCanadianPostal("3400 Avenue Linton, Montréal, QC H3T 1A8")).toBe(true);
  });

  it("appends a missing postal to a formatted address", () => {
    expect(
      formattedAddressWithPostal("3400 Avenue Linton, Montreal, QC, Canada", "H3T 1A8")
    ).toContain("H3T 1A8");
  });

  it("treats a place id or postal as a structured pick", () => {
    expect(isPickedCanadianAddress("3400 avenue Linton", "")).toBe(false);
    expect(isPickedCanadianAddress("3400 avenue Linton", "ChIJ123")).toBe(true);
    expect(
      isPickedCanadianAddress("3400 Avenue Linton, Montréal, QC H3T 1A8", "")
    ).toBe(true);
  });
});
