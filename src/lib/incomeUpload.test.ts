import { describe, expect, it } from "vitest";
import {
  A4_PORTRAIT_ASPECT,
  ID_CARD_ASPECT,
  guidedCaptureAspect,
} from "./guidedCapture";
import {
  employmentRequiresIncome,
  incomeSlotSupportsPhotoCapture,
  incomeSlotsForType,
  incomeUploadComplete,
  isOptionalIncomeSlot,
  mainIncomeDocumentSlots,
  parseMonthlyNetIncome,
  formatMonthlyNetIncome,
  requiredIncomeSlotsForType,
  staleIncomeDocumentTypes,
} from "./incomeUpload";

describe("incomeUpload", () => {
  it("maps employment types to document slots", () => {
    expect(incomeSlotsForType("employed")).toEqual([
      "pay_slip_1",
      "pay_slip_2",
      "pay_slip_3",
      "proof_of_income",
    ]);
    expect(requiredIncomeSlotsForType("employed")).toEqual(["pay_slip_1"]);
    expect(incomeSlotsForType("self_employed")).toEqual([
      "notice_of_assessment_year_1",
      "notice_of_assessment_year_2",
      "proof_of_income",
    ]);
    expect(incomeSlotsForType("other")).toEqual(["proof_of_income"]);
    expect(incomeSlotsForType("no_income")).toEqual([]);
    expect(incomeSlotsForType("guarantor_pays")).toEqual([]);
  });

  it("keeps additional proof out of the main documents list for job types", () => {
    expect(mainIncomeDocumentSlots("employed")).toEqual([
      "pay_slip_1",
      "pay_slip_2",
      "pay_slip_3",
    ]);
    expect(mainIncomeDocumentSlots("self_employed")).toEqual([
      "notice_of_assessment_year_1",
      "notice_of_assessment_year_2",
    ]);
    expect(mainIncomeDocumentSlots("other")).toEqual(["proof_of_income"]);
    expect(mainIncomeDocumentSlots("no_income")).toEqual([]);
    expect(mainIncomeDocumentSlots("guarantor_pays")).toEqual([]);
  });

  it("marks optional employed pay slips and additional proof", () => {
    expect(isOptionalIncomeSlot("employed", "pay_slip_2")).toBe(true);
    expect(isOptionalIncomeSlot("employed", "pay_slip_1")).toBe(false);
    expect(isOptionalIncomeSlot("employed", "proof_of_income")).toBe(true);
    expect(isOptionalIncomeSlot("self_employed", "proof_of_income")).toBe(true);
    expect(
      isOptionalIncomeSlot("employed", "proof_of_income", {
        requireAdditionalProof: true,
      })
    ).toBe(false);
  });

  it("detects complete income uploads", () => {
    expect(
      incomeUploadComplete("employed", ["pay_slip_1", "pay_slip_2", "pay_slip_3"])
    ).toBe(true);
    expect(incomeUploadComplete("employed", ["pay_slip_1"])).toBe(true);
    expect(
      incomeUploadComplete("employed", ["pay_slip_1"], {
        requireAdditionalProof: true,
      })
    ).toBe(false);
    expect(
      incomeUploadComplete("employed", ["pay_slip_1", "proof_of_income"], {
        requireAdditionalProof: true,
      })
    ).toBe(true);
    expect(incomeUploadComplete("employed", [])).toBe(false);
    expect(incomeUploadComplete("no_income", [])).toBe(true);
    expect(employmentRequiresIncome("no_income")).toBe(false);
    expect(incomeUploadComplete("guarantor_pays", [])).toBe(true);
    expect(employmentRequiresIncome("guarantor_pays")).toBe(false);
    expect(
      incomeUploadComplete("self_employed", [
        "notice_of_assessment_year_1",
        "notice_of_assessment_year_2",
      ])
    ).toBe(true);
    expect(
      incomeUploadComplete("self_employed", ["notice_of_assessment_year_1"])
    ).toBe(false);
  });

  it("drops stale income docs when employment type changes", () => {
    expect(
      staleIncomeDocumentTypes("self_employed", [
        "pay_slip_1",
        "pay_slip_2",
        "pay_slip_3",
        "id_passport",
      ])
    ).toEqual(["pay_slip_1", "pay_slip_2", "pay_slip_3"]);
  });

  it("parses monthly net income", () => {
    expect(parseMonthlyNetIncome("3,500.50")).toBe(3500.5);
    expect(parseMonthlyNetIncome("3800,50")).toBe(3800.5);
    expect(parseMonthlyNetIncome("$4200")).toBe(4200);
    expect(parseMonthlyNetIncome("0")).toBeNull();
    expect(parseMonthlyNetIncome("")).toBeNull();
  });

  it("formats monthly net income as CAD currency", () => {
    expect(formatMonthlyNetIncome("en", "3500")).toMatch(/\$3,500\.00/);
    expect(formatMonthlyNetIncome("fr", 4200)).toContain("4");
  });

  it("offers A4 photo capture for payslips and proof of income, not ID cards", () => {
    expect(incomeSlotSupportsPhotoCapture("pay_slip_1")).toBe(true);
    expect(incomeSlotSupportsPhotoCapture("pay_slip_2")).toBe(true);
    expect(incomeSlotSupportsPhotoCapture("pay_slip_3")).toBe(true);
    expect(incomeSlotSupportsPhotoCapture("proof_of_income")).toBe(true);
    expect(incomeSlotSupportsPhotoCapture("notice_of_assessment_year_1")).toBe(
      false
    );
    expect(incomeSlotSupportsPhotoCapture("id_medicare")).toBe(false);
  });

  it("uses a portrait A4 frame for income photos, not the ID card crop", () => {
    expect(guidedCaptureAspect("a4")).toBe(A4_PORTRAIT_ASPECT);
    expect(guidedCaptureAspect("id")).toBe(ID_CARD_ASPECT);
    expect(A4_PORTRAIT_ASPECT).toBeLessThan(1);
    expect(ID_CARD_ASPECT).toBeGreaterThan(1);
  });
});
