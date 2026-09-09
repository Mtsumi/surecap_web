/** Form vs OCR name compare — keep in sync with `tal.names.name_similarity`. */

export type NameSimilarity = "match" | "near" | "partial" | "mismatch";

function normalizePersonName(name: string): string {
  const folded = name
    .trim()
    .replace(/[\u2019\u2018\u0060\u00b4]/g, "'")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return folded.replace(/[^a-z0-9'\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenizeName(name: string): string[] {
  return normalizePersonName(name)
    .split(/[\s\-]+/)
    .filter(Boolean);
}

function levenshtein(left: string, right: string, maxDist = 2): number {
  if (left === right) return 0;
  if (Math.abs(left.length - right.length) > maxDist) return maxDist + 1;
  const prev = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current.push(
        Math.min(current[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
      );
    }
    for (let j = 0; j <= right.length; j += 1) prev[j] = current[j];
    if (Math.min(...prev) > maxDist) return maxDist + 1;
  }
  return prev[right.length];
}

function tokenDistance(left: string, right: string): number {
  if (left === right) return 0;
  let best = levenshtein(left, right);
  if (best <= 1) return best;
  const [longer, shorter] = left.length >= right.length ? [left, right] : [right, left];
  const extra = longer.length - shorter.length;
  if (extra >= 1 && extra <= 2 && shorter) {
    best = Math.min(
      best,
      levenshtein(shorter, longer.slice(0, shorter.length)),
      levenshtein(shorter, longer.slice(extra))
    );
  }
  return best;
}

function permutations(items: string[]): string[][] {
  if (items.length <= 1) return [items.slice()];
  const out: string[][] = [];
  items.forEach((item, index) => {
    const rest = items.filter((_, restIndex) => restIndex !== index);
    for (const perm of permutations(rest)) {
      out.push([item, ...perm]);
    }
  });
  return out;
}

function foldOcrPrefix(token: string): string {
  return token.replace(/^(tz|ts|cz)/, "z");
}

function lettersAreSubsequence(short: string, long: string): boolean {
  if (!short || !long) return false;
  let index = 0;
  for (const char of short) {
    const found = long.indexOf(char, index);
    if (found === -1) return false;
    index = found + 1;
  }
  return true;
}

function ocrConfusedTokens(left: string, right: string): boolean {
  if (left === right) return true;
  if (tokenDistance(left, right) <= 2) return true;
  const foldedLeft = foldOcrPrefix(left);
  const foldedRight = foldOcrPrefix(right);
  const [shorter, longer] =
    foldedLeft.length <= foldedRight.length
      ? [foldedLeft, foldedRight]
      : [foldedRight, foldedLeft];
  if (shorter.length < 3 || longer.length < 4) return false;
  if (longer.startsWith(shorter)) return true;
  return lettersAreSubsequence(shorter, longer) && shorter.length / longer.length >= 0.45;
}

function tokensAreFuzzy(formToken: string, ocrToken: string): boolean {
  return tokenDistance(formToken, ocrToken) <= 2 || ocrConfusedTokens(formToken, ocrToken);
}

function tokenAlignment(
  formTokens: string[],
  ocrTokens: string[]
): { exact: number; fuzzy: number } | null {
  if (!formTokens.length || formTokens.length !== ocrTokens.length) return null;
  if (formTokens.length > 5) {
    let fuzzy = 0;
    let exact = 0;
    const formSorted = [...formTokens].sort();
    const ocrSorted = [...ocrTokens].sort();
    for (let i = 0; i < formSorted.length; i += 1) {
      if (formSorted[i] === ocrSorted[i]) exact += 1;
      else if (tokensAreFuzzy(formSorted[i], ocrSorted[i])) fuzzy += 1;
      else return null;
    }
    return fuzzy <= 1 ? { exact, fuzzy } : null;
  }

  let best: { exact: number; fuzzy: number } | null = null;
  for (const perm of permutations(ocrTokens)) {
    let fuzzy = 0;
    let exact = 0;
    let aligned = true;
    for (let i = 0; i < formTokens.length; i += 1) {
      if (formTokens[i] === perm[i]) exact += 1;
      else if (tokensAreFuzzy(formTokens[i], perm[i])) fuzzy += 1;
      else {
        aligned = false;
        break;
      }
    }
    if (aligned && fuzzy <= 1) {
      if (fuzzy === 0) return { exact, fuzzy: 0 };
      best = { exact, fuzzy };
    }
  }
  return best;
}

function subsetAlignment(shorter: string[], longer: string[]): boolean {
  if (!shorter.length || !longer.length || shorter.length >= longer.length) {
    return false;
  }
  const used = new Set<number>();
  for (const token of shorter) {
    let bestIndex: number | null = null;
    let bestDistance = 3;
    longer.forEach((other, index) => {
      if (used.has(index)) return;
      const distance = tokenDistance(token, other);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    if (bestIndex === null || bestDistance > 2) return false;
    used.add(bestIndex);
  }
  return true;
}

export function nameSimilarity(formName: string, ocrName: string): NameSimilarity {
  const formTokens = tokenizeName(formName);
  const ocrTokens = tokenizeName(ocrName);
  if (!formTokens.length || !ocrTokens.length) return "mismatch";
  const formSorted = [...formTokens].sort().join(" ");
  const ocrSorted = [...ocrTokens].sort().join(" ");
  if (formTokens.join(" ") === ocrTokens.join(" ") || formSorted === ocrSorted) {
    return "match";
  }
  const alignment = tokenAlignment(formTokens, ocrTokens);
  if (alignment) return alignment.fuzzy === 0 ? "match" : "near";
  const [shorter, longer] =
    formTokens.length < ocrTokens.length
      ? [formTokens, ocrTokens]
      : [ocrTokens, formTokens];
  if (subsetAlignment(shorter, longer)) return "partial";
  return "mismatch";
}
