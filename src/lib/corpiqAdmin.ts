/** Admin helpers for CORPIQ screening jobs. */

export function parseCorpiqReportDocumentId(message: string | null): number | null {
  if (!message?.trim()) return null;
  try {
    const payload = JSON.parse(message) as Record<string, unknown>;
    const pdf = payload.report_pdf_document_id;
    if (typeof pdf === "number" && Number.isFinite(pdf)) return pdf;
    const id = payload.report_document_id;
    if (typeof id === "number" && Number.isFinite(id)) return id;
    return null;
  } catch {
    return null;
  }
}

export function corpiqReportDownloadContentType(message: string | null): string {
  if (!message?.trim()) return "application/pdf";
  try {
    const payload = JSON.parse(message) as Record<string, unknown>;
    if (payload.report_pdf_document_id != null) return "application/pdf";
    const viewId = payload.report_document_id;
    const htmlId = payload.report_html_document_id;
    if (
      typeof viewId === "number" &&
      typeof htmlId === "number" &&
      htmlId !== viewId
    ) {
      return "application/pdf";
    }
    if (payload.report_document_id != null) return "text/html";
    return "application/pdf";
  } catch {
    return "application/pdf";
  }
}
