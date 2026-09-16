import { describe, expect, it } from "vitest";
import { nameSimilarity } from "./names";

describe("nameSimilarity", () => {
  it("treats word-order swaps as a match", () => {
    expect(nameSimilarity("Ali Khounch", "Khounch Ali")).toBe("match");
  });

  it("treats a one-letter typo as near", () => {
    expect(nameSimilarity("Ali Khounch", "Khouinch Ali")).toBe("near");
  });

  it("treats a missing middle name on the ID as a near match", () => {
    expect(
      nameSimilarity("Mardochee Mulumba Tshibangu", "Mardochee Tshibangu")
    ).toBe("near");
  });

  it("treats an extra name on the document as partial", () => {
    expect(nameSimilarity("Maria Kasanji", "Maria Kasanji Extra")).toBe("partial");
  });

  it("treats two extra OCR letters as near", () => {
    expect(
      nameSimilarity(
        "Mardochee Mulumba Tshibangu",
        "TSHIBANGU MADROCHEEHI MULUMBA"
      )
    ).toBe("near");
  });

  it("treats Tzemach vs Zach OCR as near when the rest matches", () => {
    expect(nameSimilarity("Tzemach Mendel Steinberg", "Zach Mendel Steinberg")).toBe(
      "near"
    );
  });

  it("marks an unrelated first name as a mismatch", () => {
    expect(nameSimilarity("John Mendel Steinberg", "Zach Mendel Steinberg")).toBe(
      "mismatch"
    );
  });
});
