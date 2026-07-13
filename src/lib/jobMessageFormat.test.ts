import { describe, expect, it } from "vitest";
import {
  formatJobMessagePreview,
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

  it("labels address sources in French", () => {
    expect(sourceLabel("current_address")).toBe("Adresse actuelle");
    expect(sourceLabel("previous_address")).toBe("Adresse précédente");
  });
});
