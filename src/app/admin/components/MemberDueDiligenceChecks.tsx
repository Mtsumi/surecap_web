"use client";

import { adminUi } from "@/lib/adminUi";
import { useAdminCopy } from "@/app/admin/AdminLocaleContext";
import type { AdminMessageKey } from "@/lib/adminI18n";
import {
  DueDiligenceMember,
  JanitorReviewChecklist,
  MemberChecklistFlags,
  checklistTargetMembers,
  employerContactLine,
  facebookCheckLink,
  flagsForMember,
  landlordContactLine,
  memberChecklistKeys,
  setMemberFlag,
  telHref,
} from "@/lib/janitorChecklist";

const CHECK_LABELS: Record<keyof MemberChecklistFlags, AdminMessageKey> = {
  called_employer: "reviewCheckEmployer",
  called_landlord: "reviewCheckLandlord",
  checked_social: "reviewCheckSocial",
};

function MetaLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={adminUi.link}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </a>
  );
}

function CheckMeta({
  member,
  checkKey,
}: {
  member: DueDiligenceMember;
  checkKey: keyof MemberChecklistFlags;
}) {
  const { t } = useAdminCopy();

  // Full-width under the label on phones; sit beside on sm+.
  const metaClass =
    "text-xs text-[var(--ml-steel)] basis-full sm:basis-auto";

  if (checkKey === "called_employer") {
    const contact = employerContactLine(member);
    return (
      <span className={metaClass}>
        {contact ? (
          contact.tel ? (
            <MetaLink href={contact.tel}>{contact.label}</MetaLink>
          ) : (
            contact.label
          )
        ) : (
          t("reviewCheckNoEmployerContact")
        )}
      </span>
    );
  }

  if (checkKey === "called_landlord") {
    if (member.no_previous_landlord_contact && !member.landlord_phone) {
      return (
        <span className={metaClass}>{t("reviewCheckNoLandlordContact")}</span>
      );
    }
    const contact = landlordContactLine(member);
    if (!contact) {
      return (
        <span className={metaClass}>{t("reviewCheckNoLandlordContact")}</span>
      );
    }
    return (
      <span className={metaClass}>
        {contact.tel ? (
          <MetaLink href={contact.tel}>{contact.label}</MetaLink>
        ) : (
          contact.label
        )}
      </span>
    );
  }

  const fb = facebookCheckLink(member);
  return (
    <span className={metaClass}>
      {fb ? (
        <MetaLink href={fb.href}>
          {fb.provided
            ? t("reviewCheckOpenFacebook")
            : t("reviewCheckSearchFacebook")}
        </MetaLink>
      ) : (
        t("reviewCheckNoFacebook")
      )}
    </span>
  );
}

export default function MemberDueDiligenceChecks({
  members,
  checklist,
  disabled,
  onChange,
  onOpenId,
  showLegacyHousehold,
}: {
  members: DueDiligenceMember[];
  checklist: JanitorReviewChecklist;
  disabled?: boolean;
  onChange?: (next: JanitorReviewChecklist) => void;
  onOpenId?: (member: DueDiligenceMember) => void;
  /** Read-only household ticks from pre-per-member storage. */
  showLegacyHousehold?: boolean;
}) {
  const { t } = useAdminCopy();
  const targets = checklistTargetMembers(members);

  if (showLegacyHousehold && checklist.legacy) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-[var(--ml-steel)]">{t("reviewCheckLegacyNote")}</p>
        {(
          [
            ["called_employer", "reviewCheckEmployer"],
            ["called_landlord", "reviewCheckLandlord"],
            ["checked_social", "reviewCheckSocial"],
          ] as const
        ).map(([key, labelKey]) => (
          <label
            key={key}
            className="flex items-start gap-3 text-sm text-[var(--ml-ink)]"
          >
            <input
              type="checkbox"
              className="mt-0.5"
              checked={Boolean(checklist[key])}
              disabled
              readOnly
            />
            <span>{t(labelKey)}</span>
          </label>
        ))}
      </div>
    );
  }

  if (!targets.length) {
    return (
      <p className="text-sm text-[var(--ml-steel)]">{t("reviewCheckNoTargets")}</p>
    );
  }

  return (
    <div className="space-y-5">
      {targets.map((member) => {
        const flags = flagsForMember(checklist, member.id);
        const keys = memberChecklistKeys(member);
        const phoneTel = telHref(member.phone);
        const idDocId = member.identity?.id_document_id;
        return (
          <div
            key={member.id}
            className="space-y-2 border-t border-[var(--ml-line)] pt-3 first:border-t-0 first:pt-0"
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-sm font-medium text-[var(--ml-ink)]">
                {member.name}
                <span className="ml-2 text-xs font-normal text-[var(--ml-steel)]">
                  {member.role}
                </span>
              </p>
              {idDocId && onOpenId ? (
                <button
                  type="button"
                  className={`text-xs ${adminUi.link}`}
                  disabled={disabled}
                  onClick={() => onOpenId(member)}
                >
                  {t("reviewCheckOpenId")}
                </button>
              ) : null}
              {member.phone ? (
                phoneTel ? (
                  <MetaLink href={phoneTel}>
                    <span className="text-xs">{member.phone}</span>
                  </MetaLink>
                ) : (
                  <span className="text-xs text-[var(--ml-steel)]">{member.phone}</span>
                )
              ) : null}
            </div>
            {keys.map((key) => (
              <label
                key={key}
                className="flex items-start gap-3 text-sm text-[var(--ml-ink)]"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 shrink-0"
                  checked={flags[key]}
                  disabled={disabled || !onChange}
                  onChange={(event) => {
                    if (!onChange) return;
                    onChange(
                      setMemberFlag(
                        checklist,
                        member.id,
                        key,
                        event.target.checked
                      )
                    );
                  }}
                />
                <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span>{t(CHECK_LABELS[key])}</span>
                  <CheckMeta member={member} checkKey={key} />
                </span>
              </label>
            ))}
          </div>
        );
      })}
    </div>
  );
}
