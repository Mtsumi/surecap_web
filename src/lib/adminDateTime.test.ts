import { describe, expect, it } from "vitest";
import { formatAdminDateTime } from "./adminDateTime";

describe("formatAdminDateTime", () => {
  it("formats ISO instants in America/Toronto", () => {
    // 2026-11-03 19:22 UTC → 14:22 EST (DST already ended)
    const en = formatAdminDateTime("2026-11-03T19:22:00.000Z", "en");
    const fr = formatAdminDateTime("2026-11-03T19:22:00.000Z", "fr");
    expect(en).toMatch(/2026/);
    expect(en).toMatch(/3/);
    expect(en).toMatch(/2:22|14:22/);
    expect(fr).toMatch(/2026/);
    expect(fr).toMatch(/14 h 22|14:22|2:22/);
  });

  it("returns null for empty or invalid values", () => {
    expect(formatAdminDateTime(null, "en")).toBeNull();
    expect(formatAdminDateTime("", "fr")).toBeNull();
    expect(formatAdminDateTime("not-a-date", "en")).toBeNull();
  });
});
