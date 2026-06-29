const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Building = {
  id: number;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

export type Unit = {
  id: number;
  building_id: number;
  unit_number: string;
  civic_number: string | null;
  rent: number | null;
  available_date: string | null;
  earliest_move_in_date: string;
};

export type LocaleCode = "fr" | "en";

export type Application = {
  id: number;
  unit_id: number;
  status: string;
  given_name: string | null;
  family_name: string | null;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  current_address: string | null;
  current_place_id: string | null;
  address_not_in_canada: boolean | null;
  previous_address: string | null;
  previous_place_id: string | null;
  current_address_lived_from: string | null;
  current_address_lived_to: string | null;
  previous_address_lived_from: string | null;
  previous_address_lived_to: string | null;
  lease_in_name: boolean | null;
  move_in_date: string | null;
  renting_with_others: boolean | null;
  landlord_phone: string | null;
  hr_phone: string | null;
  landlord_name: string | null;
  hr_name: string | null;
  landlord_email: string | null;
  hr_email: string | null;
  referral_source: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  employment_type: string | null;
  monthly_net_income: number | null;
  created_at: string;
  updated_at: string;
  primary_member_id?: number | null;
  upload_token?: string | null;
};

export type MemberDocument = {
  id: number;
  application_member_id: number;
  document_type: string;
  dropbox_path: string;
  original_filename: string;
  content_type: string;
  byte_size: number;
  uploaded_at: string;
};

export type RoommateContact = {
  name: string;
  email: string;
};

export type GuarantorContact = {
  name: string;
  email: string;
  phone: string;
};

export type ApplicationUpdate = Partial<{
  given_name: string;
  family_name: string;
  date_of_birth: string;
  email: string;
  phone: string;
  current_address: string;
  current_place_id: string;
  address_not_in_canada: boolean;
  previous_address: string;
  previous_place_id: string;
  current_address_lived_from: string;
  current_address_lived_to: string;
  previous_address_lived_from: string;
  previous_address_lived_to: string;
  lease_in_name: boolean;
  move_in_date: string;
  renting_with_others: boolean;
  landlord_phone: string;
  hr_phone: string;
  landlord_name: string;
  hr_name: string;
  landlord_email?: string;
  hr_email?: string;
  referral_source: string;
  facebook_url: string;
  linkedin_url: string;
  employment_type: "employed" | "self_employed" | "other";
  monthly_net_income: number;
  roommates: RoommateContact[];
  guarantor: GuarantorContact | null;
}>;

type ApiEnvelope<T> = {
  status: "success" | "error";
  message: string;
  data: T | null;
};

function apiHeaders(init?: RequestInit): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (API_URL.includes("ngrok")) {
    headers["ngrok-skip-browser-warning"] = "1";
  }
  return headers;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: apiHeaders(init),
  });

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    body = null;
  }

  if (!res.ok || body?.status === "error") {
    throw new Error(body?.message || res.statusText);
  }

  if (!body || body.data === null || body.data === undefined) {
    throw new Error(body?.message || "Empty API response");
  }

  return body.data;
}

async function apiFetchVoid(path: string, init?: RequestInit): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: apiHeaders(init),
  });

  if (res.status === 204) {
    return;
  }

  let body: ApiEnvelope<unknown> | null = null;
  try {
    body = (await res.json()) as ApiEnvelope<unknown>;
  } catch {
    body = null;
  }

  if (!res.ok || body?.status === "error") {
    throw new Error(body?.message || res.statusText);
  }
}

async function apiFetchForm<T>(path: string, form: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  if (API_URL.includes("ngrok")) {
    headers["ngrok-skip-browser-warning"] = "1";
  }
  const res = await fetch(`${API_URL}${path}`, { method: "POST", headers, body: form });

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    body = null;
  }

  if (!res.ok || body?.status === "error") {
    throw new Error(body?.message || res.statusText);
  }
  if (!body || body.data === null || body.data === undefined) {
    throw new Error(body?.message || "Empty API response");
  }
  return body.data;
}

export function fetchBuildings(): Promise<Building[]> {
  return apiFetch<Building[]>("/buildings");
}

export function fetchUnits(buildingId: number): Promise<Unit[]> {
  return apiFetch<Unit[]>(`/buildings/${buildingId}/units`);
}

export type ApplicationSubmit = ApplicationUpdate & {
  unit_id: number;
  roommates: RoommateContact[];
  guarantor: GuarantorContact | null;
};

/** @deprecated Use submitApplicationById after creating a draft. */
export function submitApplication(payload: ApplicationSubmit): Promise<Application> {
  return apiFetch<Application>("/applications/submit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createApplicationDraft(unitId: number): Promise<Application> {
  return apiFetch<Application>("/applications", {
    method: "POST",
    body: JSON.stringify({ unit_id: unitId }),
  });
}

export function updateApplication(
  id: number,
  uploadToken: string,
  payload: ApplicationUpdate
): Promise<Application> {
  const params = new URLSearchParams({ upload_token: uploadToken });
  return apiFetch<Application>(`/applications/${id}?${params}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function submitApplicationById(
  id: number,
  uploadToken: string
): Promise<Application> {
  const params = new URLSearchParams({ upload_token: uploadToken });
  return apiFetch<Application>(`/applications/${id}/submit?${params}`, {
    method: "POST",
  });
}

export type InviteContext = {
  application_id: number;
  member_id: number;
  role: "roommate" | "guarantor";
  member_status: string;
  upload_token: string | null;
  invited_name: string | null;
  invited_email: string | null;
  invited_phone: string | null;
  primary_name: string;
  building_name: string;
  unit_number: string;
  building_address: string;
  move_in_date: string | null;
};

export type InviteeSubmitPayload = {
  given_name: string;
  family_name: string;
  date_of_birth: string;
  email: string;
  phone: string;
  current_address: string;
  current_place_id?: string;
  address_not_in_canada?: boolean;
  previous_address?: string;
  previous_place_id?: string;
  current_address_lived_from: string;
  current_address_lived_to?: string;
  previous_address_lived_from?: string;
  previous_address_lived_to?: string;
  lease_in_name?: boolean;
  move_in_date?: string;
  landlord_phone?: string;
  hr_phone?: string;
  landlord_name?: string;
  hr_name?: string;
  referral_source?: string;
  facebook_url?: string;
  linkedin_url?: string;
  employment_type: "employed" | "self_employed" | "other";
  monthly_net_income: number;
};

export type InviteeSubmitResult = {
  application_id: number;
  member_id: number;
  role: string;
  member_status: string;
  application_status: string;
  upload_token?: string | null;
};

export function fetchInvite(token: string): Promise<InviteContext> {
  return apiFetch<InviteContext>(`/applications/invites/${encodeURIComponent(token)}`);
}

export function reissueInviteUploadToken(
  token: string
): Promise<{ upload_token: string }> {
  return apiFetch<{ upload_token: string }>(
    `/applications/invites/${encodeURIComponent(token)}/upload-token`,
    { method: "POST" }
  );
}

export function submitInvite(
  token: string,
  payload: InviteeSubmitPayload
): Promise<InviteeSubmitResult> {
  return apiFetch<InviteeSubmitResult>(
    `/applications/invites/${encodeURIComponent(token)}/submit`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function uploadMemberDocument(
  applicationId: number,
  memberId: number,
  uploadToken: string,
  documentType: string,
  file: File
): Promise<MemberDocument> {
  const form = new FormData();
  form.append("upload_token", uploadToken);
  form.append("document_type", documentType);
  form.append("file", file);
  return apiFetchForm<MemberDocument>(
    `/applications/${applicationId}/members/${memberId}/uploads`,
    form
  );
}

export function uploadInviteDocument(
  inviteToken: string,
  documentType: string,
  file: File
): Promise<MemberDocument> {
  const form = new FormData();
  form.append("document_type", documentType);
  form.append("file", file);
  return apiFetchForm<MemberDocument>(
    `/applications/invites/${encodeURIComponent(inviteToken)}/uploads`,
    form
  );
}

export function listMemberDocuments(
  applicationId: number,
  memberId: number,
  uploadToken: string
): Promise<MemberDocument[]> {
  const params = new URLSearchParams({ upload_token: uploadToken });
  return apiFetch<MemberDocument[]>(
    `/applications/${applicationId}/members/${memberId}/uploads?${params}`
  );
}

export function listInviteDocuments(inviteToken: string): Promise<MemberDocument[]> {
  return apiFetch<MemberDocument[]>(
    `/applications/invites/${encodeURIComponent(inviteToken)}/uploads`
  );
}

export function deleteMemberDocument(
  applicationId: number,
  memberId: number,
  uploadToken: string,
  documentType: string
): Promise<void> {
  const params = new URLSearchParams({ upload_token: uploadToken });
  return apiFetchVoid(
    `/applications/${applicationId}/members/${memberId}/uploads/${encodeURIComponent(documentType)}?${params}`,
    { method: "DELETE" }
  );
}

export function deleteInviteDocument(
  inviteToken: string,
  documentType: string
): Promise<void> {
  return apiFetchVoid(
    `/applications/invites/${encodeURIComponent(inviteToken)}/uploads/${encodeURIComponent(documentType)}`,
    { method: "DELETE" }
  );
}
