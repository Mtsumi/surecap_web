/** Montreal Living admin — shared layout class names (see globals.css). */

export const adminUi = {
  pageTitle: "admin-page-title",
  pageSubtitle: "admin-page-subtitle",
  sectionTitle: "admin-section-title",
  sectionGap: "mt-8 space-y-4",
  card: "admin-card",
  cardPad: "admin-card admin-card-pad",
  cardHeader: "admin-card-header",
  list: "admin-list",
  fieldLabel: "admin-field-label",
  fieldValue: "admin-field-value",
  input: "admin-input",
  textarea: "admin-textarea",
  btnPrimary: "admin-btn admin-btn-primary",
  btnSecondary: "admin-btn admin-btn-secondary",
  btnDanger: "admin-btn admin-btn-danger",
  btnGhost: "admin-btn admin-btn-ghost",
  link: "admin-link",
  alertError: "admin-alert admin-alert-error",
  alertSuccess: "admin-alert admin-alert-success",
  alertWarn: "admin-alert admin-alert-warn",
  chip: "admin-chip",
  chipActive: "admin-chip admin-chip-active",
  tableWrap: "admin-table-wrap",
  table: "admin-table",
  empty: "admin-empty",
  dossierGrid: "admin-dossier-grid",
} as const;

export function applicationStatusClass(status: string): string {
  const map: Record<string, string> = {
    accepted: "admin-status admin-status-accepted",
    rejected: "admin-status admin-status-rejected",
    submitted: "admin-status admin-status-submitted",
    collecting: "admin-status admin-status-collecting",
    draft: "admin-status admin-status-draft",
  };
  return map[status] ?? "admin-status admin-status-draft";
}
