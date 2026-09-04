import { describe, expect, it } from "vitest";
import { idScreeningGlance, incomeScreeningGlance } from "./screeningGlance";

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
      "en"
    );
    expect(row.tone).toBe("ok");
    expect(row.summary).toBe("Catherine Mathieu");
  });

  it("marks a mismatched ID name as bad", () => {
    const row = idScreeningGlance(
      {
        screening_context: "canadian",
        ocr_name: "Khouinch Ali",
        name_mismatch: true,
        flags: [],
      },
      "completed",
      "en"
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
});
