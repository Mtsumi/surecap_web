/** Status-aware lines, detail strip, and timeline for admin applications. */

import type { AdminMessageKey } from "./adminI18n";
import { formatAdminDateTime } from "./adminDateTime";

export type ApplicationTimestampFields = {
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
  credit_check_requested_at?: string | null;
  janitor_reviewed_at?: string | null;
  guarantor_offer_sent_at?: string | null;
  accepted_at?: string | null;
  rejection_email_sent_at?: string | null;
};

export type TimestampLine = {
  labelKey: AdminMessageKey;
  when: string;
};

/** One status-relevant line for list/detail headers. */
export function applicationStatusTimestamp(
  app: ApplicationTimestampFields,
  locale: "fr" | "en"
): TimestampLine | null {
  const fmt = (v: string | null | undefined) => formatAdminDateTime(v, locale);

  if (app.status === "accepted") {
    const when = fmt(app.accepted_at) ?? fmt(app.updated_at);
    return when ? { labelKey: "appTsStatusAccepted", when } : null;
  }
  if (app.status === "rejected") {
    const when = fmt(app.rejection_email_sent_at) ?? fmt(app.updated_at);
    return when ? { labelKey: "appTsStatusRejected", when } : null;
  }
  if (app.status === "awaiting_credit_check") {
    const when = fmt(app.credit_check_requested_at);
    return when ? { labelKey: "appTsStatusCredit", when } : null;
  }
  if (app.status === "submitted") {
    const when = fmt(app.updated_at) ?? fmt(app.created_at);
    return when ? { labelKey: "appTsStatusUpdated", when } : null;
  }
  const when = fmt(app.created_at);
  return when ? { labelKey: "appTsStatusCreated", when } : null;
}

/** Compact header strip parts (label + formatted time). */
export function applicationTimestampStrip(
  app: ApplicationTimestampFields,
  locale: "fr" | "en"
): TimestampLine[] {
  const parts: TimestampLine[] = [];
  const push = (labelKey: AdminMessageKey, raw: string | null | undefined) => {
    const when = formatAdminDateTime(raw, locale);
    if (when) parts.push({ labelKey, when });
  };

  push("appTsCreated", app.created_at);

  const hasLaterMilestone = Boolean(
    app.credit_check_requested_at ||
      app.accepted_at ||
      app.rejection_email_sent_at
  );
  if (
    !hasLaterMilestone &&
    app.updated_at &&
    app.updated_at !== app.created_at &&
    (app.status === "submitted" || app.status === "collecting")
  ) {
    push("appTsUpdated", app.updated_at);
  }

  push("appTsCredit", app.credit_check_requested_at);

  if (app.status === "accepted") {
    push("appTsAccepted", app.accepted_at ?? app.updated_at);
  } else if (app.status === "rejected") {
    push("appTsRejected", app.rejection_email_sent_at ?? app.updated_at);
  }

  return parts;
}

export type TimelineEvent = {
  labelKey: AdminMessageKey;
  when: string;
  atMs: number;
};

/** Full timeline for detail: created → janitor → credit → guarantor → accept/reject. */
export function applicationTimelineEvents(
  app: ApplicationTimestampFields,
  locale: "fr" | "en"
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const push = (labelKey: AdminMessageKey, raw: string | null | undefined) => {
    if (raw == null || raw === "") return;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return;
    const when = formatAdminDateTime(date, locale);
    if (!when) return;
    events.push({ labelKey, when, atMs: date.getTime() });
  };

  push("appTsCreated", app.created_at);
  push("appTsJanitor", app.janitor_reviewed_at);
  push("appTsCredit", app.credit_check_requested_at);
  push("appTsGuarantor", app.guarantor_offer_sent_at);

  if (app.status === "accepted") {
    push("appTsAccepted", app.accepted_at ?? app.updated_at);
  } else if (app.status === "rejected") {
    push("appTsRejected", app.rejection_email_sent_at ?? app.updated_at);
  }

  events.sort((a, b) => a.atMs - b.atMs);
  return events;
}

/** Prefer timeline when it carries janitor/guarantor (or more rows than the strip). */
export function preferApplicationTimeline(
  strip: TimestampLine[],
  timeline: TimelineEvent[]
): boolean {
  if (
    timeline.some(
      (e) => e.labelKey === "appTsJanitor" || e.labelKey === "appTsGuarantor"
    )
  ) {
    return true;
  }
  return timeline.length > strip.length;
}
