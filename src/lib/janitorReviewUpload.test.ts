import { describe, expect, it } from "vitest";
import { JANITOR_REVIEW_UPLOAD_TYPES } from "./adminDocuments";

describe("JANITOR_REVIEW_UPLOAD_TYPES", () => {
  it("includes ID and income slots for janitor pre-credit upload", () => {
    expect(JANITOR_REVIEW_UPLOAD_TYPES).toContain("id_passport");
    expect(JANITOR_REVIEW_UPLOAD_TYPES).toContain("pay_slip_1");
    expect(JANITOR_REVIEW_UPLOAD_TYPES).toContain("proof_of_income");
    expect(JANITOR_REVIEW_UPLOAD_TYPES).not.toContain("credit_consent");
    expect(JANITOR_REVIEW_UPLOAD_TYPES).not.toContain("selfie");
  });
});
