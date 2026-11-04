import { describe, expect, it } from "vitest";
import {
  applicationStatusTimestamp,
  applicationTimelineEvents,
  applicationTimestampStrip,
  preferApplicationTimeline,
} from "./applicationTimestamps";

describe("applicationStatusTimestamp", () => {
  it("prefers accepted_at for accepted apps", () => {
    const line = applicationStatusTimestamp(
      {
        status: "accepted",
        created_at: "2026-10-01T12:00:00.000Z",
        updated_at: "2026-11-04T18:00:00.000Z",
        accepted_at: "2026-11-04T17:30:00.000Z",
      },
      "en"
    );
    expect(line?.labelKey).toBe("appTsStatusAccepted");
    expect(line?.when).toBeTruthy();
  });

  it("uses credit_check_requested_at while awaiting credit", () => {
    const line = applicationStatusTimestamp(
      {
        status: "awaiting_credit_check",
        created_at: "2026-10-01T12:00:00.000Z",
        credit_check_requested_at: "2026-10-20T15:00:00.000Z",
      },
      "fr"
    );
    expect(line?.labelKey).toBe("appTsStatusCredit");
  });
});

describe("applicationTimestampStrip", () => {
  it("builds created → credit → accepted", () => {
    const strip = applicationTimestampStrip(
      {
        status: "accepted",
        created_at: "2026-10-01T12:00:00.000Z",
        credit_check_requested_at: "2026-10-20T15:00:00.000Z",
        accepted_at: "2026-11-04T17:30:00.000Z",
        updated_at: "2026-11-04T17:30:00.000Z",
      },
      "en"
    );
    expect(strip.map((p) => p.labelKey)).toEqual([
      "appTsCreated",
      "appTsCredit",
      "appTsAccepted",
    ]);
  });
});

describe("applicationTimelineEvents", () => {
  it("orders milestones chronologically", () => {
    const events = applicationTimelineEvents(
      {
        status: "accepted",
        created_at: "2026-10-01T12:00:00.000Z",
        janitor_reviewed_at: "2026-10-18T12:00:00.000Z",
        credit_check_requested_at: "2026-10-20T15:00:00.000Z",
        guarantor_offer_sent_at: "2026-10-25T15:00:00.000Z",
        accepted_at: "2026-11-04T17:30:00.000Z",
      },
      "en"
    );
    expect(events.map((e) => e.labelKey)).toEqual([
      "appTsCreated",
      "appTsJanitor",
      "appTsCredit",
      "appTsGuarantor",
      "appTsAccepted",
    ]);
  });
});

describe("preferApplicationTimeline", () => {
  it("prefers timeline when janitor is present even if lengths match", () => {
    const app = {
      status: "submitted",
      created_at: "2026-10-01T12:00:00.000Z",
      updated_at: "2026-10-10T12:00:00.000Z",
      janitor_reviewed_at: "2026-10-09T12:00:00.000Z",
    };
    const strip = applicationTimestampStrip(app, "en");
    const timeline = applicationTimelineEvents(app, "en");
    expect(strip.map((p) => p.labelKey)).toEqual(["appTsCreated", "appTsUpdated"]);
    expect(timeline.map((e) => e.labelKey)).toEqual([
      "appTsCreated",
      "appTsJanitor",
    ]);
    expect(preferApplicationTimeline(strip, timeline)).toBe(true);
  });
});
