import { facebookLink } from "@/lib/facebookSearch";

export type MemberChecklistFlags = {
  called_employer: boolean;
  called_landlord: boolean;
  checked_social: boolean;
};

/** Stored / API checklist: per-member ticks, optional legacy household row. */
export type JanitorReviewChecklist = {
  members: Record<string, MemberChecklistFlags>;
  legacy?: boolean;
  called_employer?: boolean;
  called_landlord?: boolean;
  checked_social?: boolean;
};

export type DueDiligenceMember = {
  id: number;
  role: string;
  member_status?: string | null;
  name: string;
  phone?: string | null;
  employer_name?: string | null;
  hr_name?: string | null;
  hr_phone?: string | null;
  landlord_name?: string | null;
  landlord_phone?: string | null;
  previous_landlord_name?: string | null;
  previous_landlord_phone?: string | null;
  no_previous_landlord_contact?: boolean;
  facebook_url?: string | null;
  identity?: { id_document_id?: number | null } | null;
};

export const EMPTY_MEMBER_FLAGS: MemberChecklistFlags = {
  called_employer: false,
  called_landlord: false,
  checked_social: false,
};

export function emptyChecklist(): JanitorReviewChecklist {
  return { members: {} };
}

export function parseChecklist(raw: unknown): JanitorReviewChecklist {
  if (!raw || typeof raw !== "object") return emptyChecklist();
  const obj = raw as Record<string, unknown>;
  const membersRaw = obj.members;
  if (membersRaw && typeof membersRaw === "object") {
    const members: Record<string, MemberChecklistFlags> = {};
    for (const [mid, flags] of Object.entries(
      membersRaw as Record<string, unknown>
    )) {
      const f = (flags && typeof flags === "object" ? flags : {}) as Record<
        string,
        unknown
      >;
      members[String(mid)] = {
        called_employer: Boolean(f.called_employer),
        called_landlord: Boolean(f.called_landlord),
        checked_social: Boolean(f.checked_social),
      };
    }
    return { members };
  }
  if (
    "called_employer" in obj ||
    "called_landlord" in obj ||
    "checked_social" in obj
  ) {
    return {
      members: {},
      legacy: true,
      called_employer: Boolean(obj.called_employer),
      called_landlord: Boolean(obj.called_landlord),
      checked_social: Boolean(obj.checked_social),
    };
  }
  return emptyChecklist();
}

/** Submitted members who need employer / social (+ landlord for tenants). */
export function checklistTargetMembers<T extends DueDiligenceMember>(
  members: T[]
): T[] {
  return members.filter((m) => {
    const status = (m.member_status || "").trim();
    // Admin always has status; review may omit on older payloads — keep if not invited-only.
    if (status) return status === "submitted";
    return m.role !== "roommate" || Boolean(m.employer_name || m.hr_phone || m.phone);
  });
}

export function memberChecklistKeys(
  member: DueDiligenceMember
): (keyof MemberChecklistFlags)[] {
  if (member.role === "guarantor") {
    return ["called_employer", "checked_social"];
  }
  return ["called_employer", "called_landlord", "checked_social"];
}

export function flagsForMember(
  checklist: JanitorReviewChecklist,
  memberId: number
): MemberChecklistFlags {
  return checklist.members[String(memberId)] ?? { ...EMPTY_MEMBER_FLAGS };
}

export function setMemberFlag(
  checklist: JanitorReviewChecklist,
  memberId: number,
  key: keyof MemberChecklistFlags,
  value: boolean
): JanitorReviewChecklist {
  const mid = String(memberId);
  const current = flagsForMember(checklist, memberId);
  return {
    members: {
      ...checklist.members,
      [mid]: { ...current, [key]: value },
    },
  };
}

export function checklistComplete(
  checklist: JanitorReviewChecklist,
  members: DueDiligenceMember[]
): boolean {
  const targets = checklistTargetMembers(members);
  if (!targets.length) return false;
  return targets.every((member) => {
    const flags = flagsForMember(checklist, member.id);
    return memberChecklistKeys(member).every((key) => flags[key]);
  });
}

export function telHref(phone: string | null | undefined): string | null {
  const raw = (phone || "").trim();
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.replace(/\D/g, "").length < 7) return null;
  return `tel:${digits}`;
}

function contactDisplayLabel(
  name: string | null,
  phone: string | null | undefined
): string {
  const n = (name || "").trim() || null;
  const p = (phone || "").trim() || null;
  if (n && p) return `${n} · ${p}`;
  return n || p || "";
}

export function employerContactLine(member: DueDiligenceMember): {
  label: string;
  tel: string | null;
} | null {
  const name =
    [member.employer_name, member.hr_name].filter(Boolean).join(" · ") || null;
  const phone = member.hr_phone;
  const tel = telHref(phone);
  if (!name && !tel && !phone) return null;
  return {
    label: contactDisplayLabel(name, phone),
    tel,
  };
}

export function landlordContactLine(member: DueDiligenceMember): {
  label: string;
  tel: string | null;
} | null {
  if (member.role === "guarantor") return null;
  if (member.no_previous_landlord_contact && !member.landlord_phone) {
    return { label: "", tel: null };
  }
  const name = member.landlord_name || member.previous_landlord_name || null;
  const phone = member.landlord_phone || member.previous_landlord_phone;
  const tel = telHref(phone);
  if (!name && !phone) return null;
  return { label: contactDisplayLabel(name, phone), tel };
}

export function facebookCheckLink(member: DueDiligenceMember) {
  return facebookLink(member.facebook_url, member.name);
}
