import { describe, expect, it } from "vitest";
import { parseCorpiqReportDocumentId } from "./corpiqAdmin";

describe("corpiqAdmin", () => {
  it("parses report_document_id from job message", () => {
    expect(parseCorpiqReportDocumentId(null)).toBeNull();
    expect(parseCorpiqReportDocumentId("{")).toBeNull();
    expect(parseCorpiqReportDocumentId(JSON.stringify({ paid: true }))).toBeNull();
    expect(
      parseCorpiqReportDocumentId(
        JSON.stringify({ paid: true, report_document_id: 42 })
      )
    ).toBe(42);
  });
});
