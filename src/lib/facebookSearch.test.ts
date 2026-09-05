import { describe, expect, it } from "vitest";
import { facebookLink, facebookPeopleSearchUrl } from "./facebookSearch";

describe("facebookPeopleSearchUrl", () => {
  it("builds a people search URL", () => {
    expect(facebookPeopleSearchUrl("Catherine Mathieu")).toBe(
      "https://www.facebook.com/search/people/?q=Catherine%20Mathieu"
    );
  });

  it("returns null for a blank name", () => {
    expect(facebookPeopleSearchUrl("   ")).toBeNull();
  });
});

describe("facebookLink", () => {
  it("prefers a provided profile URL", () => {
    const link = facebookLink("https://facebook.com/jane", "Jane Doe");
    expect(link).toEqual({
      href: "https://facebook.com/jane",
      label: "https://facebook.com/jane",
      provided: true,
    });
  });

  it("falls back to a name search", () => {
    const link = facebookLink(null, "Jane Doe");
    expect(link?.provided).toBe(false);
    expect(link?.href).toContain("facebook.com/search/people");
    expect(link?.label).toBe("Rechercher sur Facebook");
  });
});
