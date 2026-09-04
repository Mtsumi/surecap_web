import { describe, expect, it } from "vitest";
import {
  householdAffordabilityGlance,
  idScreeningGlance,
  incomeScreeningGlance,
} from "./screeningGlance";

describe("screeningGlance", () => {
  it("marks a matching ID name as ok", () => {
    const row = idScreeningGlance(
      {
        screening_context: "canadian",
        ocr_name: "Catherine Mathieu",
        name_mismatch: false,
        flags: [],
      },
      "completed",
      "en",
      "Catherine Mathieu"
    );
    expect(row.tone).toBe("ok");
    expect(row.summary).toBe("Catherine Mathieu");
  });

  it("treats last-name-first OCR as an exact match", () => {
    const row = idScreeningGlance(
      {
        screening_context: "canadian",
        ocr_name: "Khounch Ali",
        name_mismatch: true,
        flags: [],
      },
      "completed",
      "en",
      "Ali Khounch"
    );
    expect(row.tone).toBe("ok");
    expect(row.summary).toBe("Khounch Ali");
  });

  it("treats a one-letter OCR typo as a near match, not a failure", () => {
    const row = idScreeningGlance(
      {
        screening_context: "canadian",
        ocr_name: "Khouinch Ali",
        name_mismatch: true,
        flags: [],
      },
      "completed",
      "en",
      "Ali Khounch"
    );
    expect(row.tone).toBe("warn");
    expect(row.summary).toMatch(/≈ form/);
    expect(row.issues.some((issue) => /Ali Khounch/.test(issue))).toBe(true);
  });

  it("marks a mismatched ID name as bad", () => {
    const row = idScreeningGlance(
      {
        screening_context: "canadian",
        ocr_name: "Wrong Name",
        name_mismatch: true,
        flags: [],
      },
      "completed",
      "en",
      "Jane Doe"
    );
    expect(row.tone).toBe("bad");
    expect(row.summary).toMatch(/≠ form/);
  });

  it("summarizes a readable payslip and keeps fewer-than-3 as a note, not a failure", () => {
    const row = incomeScreeningGlance(
      {
        payslip_like: true,
        employer_name: "Hôtel Gault",
        net_pay: 1685.8,
        hourly_rate: 33,
        hours: 64,
        slip_count: 1,
        flags: ["income_doc_partial", "payslip_stale"],
      },
      "completed",
      "en"
    );
    expect(row.tone).toBe("warn");
    expect(row.summary).toMatch(/Gault/);
    expect(row.summary).toMatch(/1,685\.80|1685\.80/);
    expect(row.issues.some((issue) => /older than 6 months/i.test(issue))).toBe(true);
    expect(row.issues.some((issue) => /Fewer than 3/i.test(issue))).toBe(true);
  });

  it("marks an unread payslip as bad", () => {
    const row = incomeScreeningGlance(
      { payslip_like: false, flags: ["payslip_not_recognized"] },
      "completed",
      "en"
    );
    expect(row.tone).toBe("bad");
  });

  it("shows household OCR vs rent from the shared API snapshot", () => {
    const row = householdAffordabilityGlance(
      {
        rent: 1500,
        declared_monthly: 4500,
        declared_ratio: 3,
        declared_tone: "ok",
        declared_label: "3.0× rent ($4,500.00 net / $1,500.00 rent)",
        ocr_monthly: 4500,
        ocr_note: "2 tenants",
        ocr_ratio: 3,
        ocr_tone: "ok",
        ocr_label: "3.0× rent ($4,500.00 net / $1,500.00 rent)",
      },
      "en"
    );
    expect(row.tone).toBe("ok");
    expect(row.summary).toMatch(/3\.0× rent/);
    expect(row.issues).toContain("2 tenants");
  });
});
