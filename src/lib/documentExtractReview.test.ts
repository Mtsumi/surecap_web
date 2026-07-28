import { describe, expect, it } from "vitest";
import {
  isIdExtractInconclusive,
  isIncomeExtractInconclusive,
} from "./documentExtractReview";

describe("documentExtractReview", () => {
  it("flags unreadable or non-payslip income extracts", () => {
    expect(
      isIncomeExtractInconclusive({
        payslip_like: false,
        flags: [],
      })
    ).toBe(true);
    expect(
      isIncomeExtractInconclusive({
        payslip_like: true,
        flags: ["name_mismatch_payslip_form"],
      })
    ).toBe(false);
    expect(
      isIncomeExtractInconclusive({
        payslip_like: true,
        flags: ["payslip_partial_not_recognized"],
      })
    ).toBe(true);
  });

  it("flags ID extracts with blur or missing name on Canadian ID", () => {
    expect(
      isIdExtractInconclusive({
        screening_context: "canadian",
        flags: ["blur_front"],
      })
    ).toBe(true);
    expect(
      isIdExtractInconclusive({
        screening_context: "canadian",
        flags: [],
        ocr_name: null,
        barcode_name: null,
      })
    ).toBe(true);
    expect(
      isIdExtractInconclusive({
        screening_context: "canadian",
        flags: [],
        ocr_name: "Jane Doe",
      })
    ).toBe(false);
    expect(
      isIdExtractInconclusive({
        screening_context: "passport_only",
        flags: ["non_canadian_id_context"],
        ocr_name: null,
      })
    ).toBe(false);
  });
});
