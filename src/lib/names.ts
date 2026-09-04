/** Form vs OCR name compare — keep in sync with `tal.names.name_similarity`. */

export type NameSimilarity = "match" | "near" | "mismatch";

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
  return normalizePersonName(name).split(" ").filter(Boolean);
}

function levenshtein(left: string, right: string): number {
  if (left === right) return 0;
  if (Math.abs(left.length - right.length) > 1) return 2;
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
  }
  return prev[right.length];
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

function tokenBagsEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((token, index) => token === b[index]);
}

function namesMatch(formName: string, ocrName: string): boolean {
  const formNorm = normalizePersonName(formName);
  const ocrNorm = normalizePersonName(ocrName);
  if (!formNorm || !ocrNorm) return false;
  if (formNorm === ocrNorm) return true;
  const formTokens = tokenizeName(formName);
  const ocrTokens = tokenizeName(ocrName);
  if (!formTokens.length || !ocrTokens.length) return false;
  return tokenBagsEqual(formTokens, ocrTokens);
}

export function nameSimilarity(formName: string, ocrName: string): NameSimilarity {
  if (namesMatch(formName, ocrName)) return "match";
  const formTokens = tokenizeName(formName);
  const ocrTokens = tokenizeName(ocrName);
  if (!formTokens.length || formTokens.length !== ocrTokens.length) return "mismatch";

  let bestFuzzy: number | null = null;
  for (const perm of permutations(ocrTokens)) {
    let fuzzy = 0;
    let aligned = true;
    for (let i = 0; i < formTokens.length; i += 1) {
      const distance = levenshtein(formTokens[i], perm[i]);
      if (distance === 0) continue;
      if (distance === 1) {
        fuzzy += 1;
        continue;
      }
      aligned = false;
      break;
    }
    if (aligned && fuzzy <= 1) {
      if (fuzzy === 0) return "match";
      bestFuzzy = fuzzy;
    }
  }
  if (bestFuzzy === 1) return "near";
  return "mismatch";
}
