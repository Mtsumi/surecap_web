import { clearAdminToken, getAdminToken } from "./adminAuth";
import { AdminNetworkError, isAdminNetworkError } from "./adminFetchError";
import { triggerBlobDownload } from "./adminDocuments";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Disposition = "inline" | "attachment";

function fileHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = getAdminToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (API_URL.includes("ngrok")) headers["ngrok-skip-browser-warning"] = "1";
  return headers;
}

export function maintenanceAttachmentFilePath(
  ticketId: number,
  attachmentId: number
): string {
  return `/maintenance/tickets/${ticketId}/attachments/${attachmentId}/file`;
}

export async function fetchMaintenanceAttachmentBlob(
  ticketId: number,
  attachmentId: number,
  disposition: Disposition = "inline"
): Promise<Blob> {
  const url = new URL(`${API_URL}${maintenanceAttachmentFilePath(ticketId, attachmentId)}`);
  url.searchParams.set("disposition", disposition);

  let res: Response;
  try {
    res = await fetch(url.toString(), { headers: fileHeaders() });
  } catch (error) {
    if (isAdminNetworkError(error)) throw new AdminNetworkError();
    throw error;
  }

  if (res.status === 401) {
    clearAdminToken();
    if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
      window.location.href = "/admin/login";
    }
    throw new Error("Session expired");
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string; detail?: string };
      message = body.detail || body.message || message;
    } catch {
      /* binary */
    }
    throw new Error(message || "Download failed");
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength === 0) throw new Error("Empty file");
  const type =
    res.headers.get("content-type")?.split(";")[0]?.trim() || "application/octet-stream";
  return new Blob([buffer], { type });
}

export async function openMaintenanceAttachmentInline(
  ticketId: number,
  attachmentId: number
): Promise<void> {
  const blob = await fetchMaintenanceAttachmentBlob(ticketId, attachmentId, "inline");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadMaintenanceAttachment(
  ticketId: number,
  attachmentId: number,
  filename: string
): Promise<void> {
  const blob = await fetchMaintenanceAttachmentBlob(ticketId, attachmentId, "attachment");
  triggerBlobDownload(blob, filename);
}
