import { describe, expect, it } from "vitest";
import { moveSuggestionIndex } from "./addressSuggestNav";

describe("moveSuggestionIndex", () => {
  it("ArrowDown from no selection highlights the first item", () => {
    expect(moveSuggestionIndex(-1, "ArrowDown", 3)).toBe(0);
  });

  it("ArrowUp from no selection stays unselected", () => {
    expect(moveSuggestionIndex(-1, "ArrowUp", 3)).toBe(-1);
  });

  it("ArrowUp from the first item clears the highlight", () => {
    expect(moveSuggestionIndex(0, "ArrowUp", 3)).toBe(-1);
  });

  it("does not run past the last item", () => {
    expect(moveSuggestionIndex(2, "ArrowDown", 3)).toBe(2);
  });
});
