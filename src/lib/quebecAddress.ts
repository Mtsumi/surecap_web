/** Detect Quebec addresses from free-text / Places formatted strings. */

const QC_PROVINCE = /\b(QC|Québec|Quebec)\b/i;
const NON_QC_PROVINCE =
  /\b(ON|Ontario|BC|British Columbia|AB|Alberta|MB|Manitoba|SK|Saskatchewan|NS|Nova Scotia|NB|New Brunswick|NL|Newfoundland|PE|Prince Edward Island|NT|NU|YT|Yukon)\b/i;
const POSTAL = /([A-Za-z]\d[A-Za-z])\s*(\d[A-Za-z]\d)/;
const QC_POSTAL_FIRST = new Set(["G", "H", "J"]);

export function addressLooksQuebec(address: string): boolean {
  const raw = address.trim();
  if (!raw) return false;
  if (NON_QC_PROVINCE.test(raw)) return false;
  if (QC_PROVINCE.test(raw)) return true;
  const m = POSTAL.exec(raw);
  if (!m) return false;
  return QC_POSTAL_FIRST.has(m[1][0].toUpperCase());
}
