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

  it("joins nickname and short civic", () => {
    expect(
      buildingLabel("Linton", "3400 Av. Linton, Montréal, QC H3S 1T2")
    ).toBe("Linton — 3400 Av. Linton");
    expect(buildingLabel("Goyer", "3270 Rue Goyer, Montréal, QC")).toBe(
      "Goyer — 3270 Rue Goyer"
    );
  });

  it("avoids duplicating when name already contains the civic", () => {
    expect(buildingLabel("3400 Av. Linton", "3400 Av. Linton, Montréal")).toBe(
      "3400 Av. Linton"
    );
    expect(buildingLabel("Linton", "Linton")).toBe("Linton");
  });

  it("falls back to name when address is missing", () => {
    expect(buildingLabel("Linton", null)).toBe("Linton");
    expect(buildingLabel("Linton", "")).toBe("Linton");
  });
});
