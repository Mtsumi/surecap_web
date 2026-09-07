import { describe, expect, it } from "vitest";
import { nameSimilarity } from "./names";

describe("nameSimilarity", () => {
  it("treats word-order swaps as a match", () => {
    expect(nameSimilarity("Ali Khounch", "Khounch Ali")).toBe("match");
  });

  it("treats a one-letter typo as near", () => {
    expect(nameSimilarity("Ali Khounch", "Khouinch Ali")).toBe("near");
  });

  it("labels a missing middle name as partial", () => {
    expect(
      nameSimilarity("Mardochee Mulumba Tshibangu", "Mardochee Tshibangu")
    ).toBe("partial");
  });

  it("treats two extra OCR letters as near", () => {
    expect(
      nameSimilarity(
        "Mardochee Mulumba Tshibangu",
        "TSHIBANGU MADROCHEEHI MULUMBA"
      )
    ).toBe("near");
  });

  it("marks unrelated names as a mismatch", () => {
    expect(nameSimilarity("Jane Doe", "Wrong Name")).toBe("mismatch");
  });
});
