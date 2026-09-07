/** Keyboard highlight for the server Places suggestion list. */
export function moveSuggestionIndex(
  current: number,
  key: "ArrowDown" | "ArrowUp",
  count: number
): number {
  if (count <= 0) return -1;
  if (key === "ArrowDown") return Math.min(current + 1, count - 1);
  return Math.max(current - 1, -1);
}
