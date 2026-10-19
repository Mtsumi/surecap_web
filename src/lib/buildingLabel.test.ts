import { describe, expect, it } from "vitest";
import { buildingLabel, shortCivicAddress } from "./buildingLabel";

describe("buildingLabel", () => {
  it("takes the street line before the first comma", () => {
    expect(shortCivicAddress("3400 Av. Linton, Montréal, QC H3S 1T2")).toBe(
      "3400 Av. Linton"
    );
    expect(shortCivicAddress("  151 10e Avenue, Lachine, QC  ")).toBe(
      "151 10e Avenue"
    );
    expect(shortCivicAddress("")).toBe("");
    expect(shortCivicAddress(null)).toBe("");
  });

  it("returns building name only (address is subtitle elsewhere)", () => {
    expect(
      buildingLabel("Linton", "3400 Av. Linton, Montréal, QC H3S 1T2")
    ).toBe("Linton");
    expect(buildingLabel("Goyer", "3270 Rue Goyer, Montréal, QC")).toBe(
      "Goyer"
    );
    expect(
      buildingLabel(
        "10e avenue",
        "151-153-155 10e avenue, Lachine, QC, H8S 3E2"
      )
    ).toBe("10e avenue");
  });

  it("falls back to name when address is missing", () => {
    expect(buildingLabel("Linton", null)).toBe("Linton");
    expect(buildingLabel("Linton", "")).toBe("Linton");
  });
});
