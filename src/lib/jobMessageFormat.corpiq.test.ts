import { describe, expect, it } from "vitest";
import {
  corpiqSafeToRerunAfterPortalCheck,
  formatCorpiqFailure,
  localizeCorpiqStageLabel,
} from "./jobMessageFormat";

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
        summary: "The portal was still loading.",
      },
      "en"
    );
    expect(copy?.title).toBe("Portal still loading");
    expect(copy?.detail.toLowerCase()).toMatch(/before re-run/);
  });

  it("maps paid_no_report without encouraging re-run pay", () => {
    const copy = formatCorpiqFailure({ error_code: "paid_no_report" }, "en");
    expect(copy?.title).toMatch(/Paid/);
    expect(copy?.detail.toLowerCase()).toMatch(/do not re-run/);
  });

  it("localizes FR", () => {
    const copy = formatCorpiqFailure({ error_code: "unpaid_invoice" }, "fr");
    expect(copy?.title).toMatch(/Facture/);
  });

  it("maps worker_timeout and stale_running", () => {
    expect(formatCorpiqFailure({ error_code: "worker_timeout" }, "en")?.title).toBe(
      "Timed out"
    );
    expect(
      formatCorpiqFailure({ error_code: "stale_running" }, "en")?.detail.toLowerCase()
    ).toMatch(/unpaid invoice/);
  });

  it("maps confirm_hung", () => {
    expect(formatCorpiqFailure({ error_code: "confirm_hung" }, "en")?.title).toBe(
      "Confirm hung"
    );
  });

  it("localizes live stage labels", () => {
    expect(
      localizeCorpiqStageLabel({ stage: "confirm", stage_label: "Confirming screening" }, "fr")
    ).toBe("Confirmation");
    expect(
      localizeCorpiqStageLabel({ stage: "pay_wait", stage_label: "Waiting for report" }, "en")
    ).toBe("Waiting for report");
  });

  it("flags safe re-run failures", () => {
    expect(corpiqSafeToRerunAfterPortalCheck({ error_code: "stale_running" })).toBe(true);
    expect(corpiqSafeToRerunAfterPortalCheck({ error_code: "paid_no_report" })).toBe(false);
  });
});
