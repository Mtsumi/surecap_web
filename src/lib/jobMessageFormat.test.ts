import { describe, expect, it } from "vitest";
import {
  formatJobMessagePreview,
  parseIdDocumentExtractMessage,
  parseTalScreeningMessage,
  sourceLabel,
} from "./jobMessageFormat";

describe("jobMessageFormat", () => {
  it("parses TAL JSON and shows summary preview", () => {
    const message = JSON.stringify({
      summary: "2 address(es): 2 completed; 3 dossier(s) matched",
      applicant_name: "Stéphane Larose",
      searches: [],
    });
    expect(parseTalScreeningMessage(message)?.applicant_name).toBe("Stéphane Larose");
    expect(formatJobMessagePreview("tal_screening", message)).toContain("2 address(es)");
  });

  it("parses id_document_extract JSON", () => {
    const message = JSON.stringify({
      screening_context: "canadian",
      flags: ["blur_front"],
      name_mismatch: true,
      ocr_name: "STEVE KMNOT",
      pdf417_ok: false,
      addresses: [],
    });
    expect(parseIdDocumentExtractMessage(message)?.name_mismatch).toBe(true);
    expect(formatJobMessagePreview("id_document_extract", message)).toContain(
      "Nom différent"
    );
  });

  it("labels address sources in French", () => {
    expect(sourceLabel("current_address")).toBe("Adresse actuelle");
    expect(sourceLabel("id_pdf417_address")).toBe("Adresse permis (PDF417)");
  });
});
