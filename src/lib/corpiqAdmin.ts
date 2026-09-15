/** CORPIQ admin helpers (message parsing for ScreeningJobs). */

export function parseCorpiqReportDocumentId(message: string | null): number | null {
  if (!message) return null;
  try {
    const parsed = JSON.parse(message) as { report_document_id?: number };
    return typeof parsed.report_document_id === "number"
      ? parsed.report_document_id
      : null;
  } catch {
    return null;
  }
}
