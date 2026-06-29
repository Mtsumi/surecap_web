import { describe, expect, it } from "vitest";
import {
  incomeSlotsForType,
  incomeUploadComplete,
  parseMonthlyNetIncome,
  formatMonthlyNetIncome,
  staleIncomeDocumentTypes,
} from "./incomeUpload";

describe("incomeUpload", () => {
  it("maps employment types to document slots", () => {
    expect(incomeSlotsForType("employed")).toEqual(["pay_slip_1"]);
    expect(incomeSlotsForType("self_employed")).toEqual([
      "notice_of_assessment_year_1",
    ]);
    expect(incomeSlotsForType("other")).toEqual(["proof_of_income"]);
  });

  it("detects complete income uploads", () => {
    expect(incomeUploadComplete("employed", ["pay_slip_1"])).toBe(true);
    expect(incomeUploadComplete("employed", [])).toBe(false);
  });

  it("drops stale income docs when employment type changes", () => {
    expect(
      staleIncomeDocumentTypes("self_employed", ["pay_slip_1", "id_passport"])
    ).toEqual(["pay_slip_1"]);
  });

  it("parses monthly net income", () => {
    expect(parseMonthlyNetIncome("3,500.50")).toBe(3500.5);
    expect(parseMonthlyNetIncome("$4200")).toBe(4200);
    expect(parseMonthlyNetIncome("0")).toBeNull();
    expect(parseMonthlyNetIncome("")).toBeNull();
  });

  it("formats monthly net income as CAD currency", () => {
    expect(formatMonthlyNetIncome("en", "3500")).toMatch(/\$3,500\.00/);
    expect(formatMonthlyNetIncome("fr", 4200)).toContain("4");
  });
});
