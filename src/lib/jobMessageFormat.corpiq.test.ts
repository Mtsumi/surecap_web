import { describe, expect, it } from "vitest";
import { formatCorpiqFailure } from "./jobMessageFormat";

describe("formatCorpiqFailure", () => {
  it("maps step_unchanged without em dashes", () => {
    const copy = formatCorpiqFailure(
      {
        error_code: "step_unchanged",
        stage_label: "Stopped at step unchanged",
        summary: "Live run stopped at step unchanged",
      },
      "en"
    );
    expect(copy?.title).toBe("Stuck on applicant step");
    expect(copy?.detail).toMatch(/Do not re-run/);
    expect(copy?.detail).not.toMatch(/—/);
    expect(copy?.title).not.toMatch(/—/);
  });

  it("maps portal_navigation for Steve after confirm race", () => {
    const copy = formatCorpiqFailure(
      {
        error_code: "portal_navigation",
        stage_label: "Portal still loading",
        summary: "Confirm started but the portal was still loading.",
      },
      "en"
    );
    expect(copy?.title).toBe("Portal still loading");
    expect(copy?.detail.toLowerCase()).toMatch(/unpaid invoice/);
  });

  it("localizes FR", () => {
    const copy = formatCorpiqFailure({ error_code: "unpaid_invoice" }, "fr");
    expect(copy?.title).toMatch(/Facture/);
  });
});
