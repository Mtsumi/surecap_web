import type { AdminUser } from "./adminApi";
import type { Locale } from "./i18n";

export const MAINTENANCE_CATEGORIES = [
  "water_leak",
  "plumbing",
  "heating",
  "electrical",
  "carpentry",
  "mold_humidity",
  "other",
] as const;

export const MAINTENANCE_STATUSES = [
  "pending_owner",
  "declined",
  "open",
  "acknowledged",
  "assigned",
  "awaiting_tenant",
  "scheduled",
  "in_progress",
  "pending_manager_close",
  "closed",
] as const;

export const MAINTENANCE_ROLES = [
  "staff",
  "janitor",
  "maintenance_manager",
  "worker",
] as const;

export type MaintenanceCategory = (typeof MAINTENANCE_CATEGORIES)[number];
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];
export type MaintenanceRole = (typeof MAINTENANCE_ROLES)[number];

export function canAccessMaintenance(user: AdminUser | null | undefined): boolean {
  if (!user?.active) return false;
  if (user.is_super_admin) return true;
  return Boolean(user.maintenance_role);
}

/** Maintenance-role users who are not super admin should not see screening/building nav. */
export function isMaintenanceOnlyUser(user: AdminUser | null | undefined): boolean {
  if (!user?.active) return false;
  if (user.is_super_admin) return false;
  return Boolean(user.maintenance_role);
}

export function buildingsForMaintenanceUser<T extends { id: number }>(
  user: AdminUser | null | undefined,
  buildings: T[]
): T[] {
  if (!user || user.is_super_admin || user.maintenance_role !== "janitor") {
    return buildings;
  }
  const allowed = new Set(user.janitor_building_ids ?? []);
  return buildings.filter((b) => allowed.has(b.id));
}

const STATUS_LABEL_FR: Record<string, string> = {
  pending_owner: "Approbation requise",
  declined: "Refusé",
  open: "Ouvert",
  acknowledged: "Accusé réception",
  assigned: "Assigné",
  awaiting_tenant: "En attente locataire",
  scheduled: "Planifié",
  in_progress: "En cours",
  pending_manager_close: "À fermer",
  closed: "Terminé",
};

const STATUS_LABEL_EN: Record<string, string> = {
  pending_owner: "Awaiting approval",
  declined: "Declined",
  open: "Open",
  acknowledged: "Acknowledged",
  assigned: "Assigned",
  awaiting_tenant: "Awaiting tenant",
  scheduled: "Scheduled",
  in_progress: "In progress",
  pending_manager_close: "Pending close",
  closed: "Closed",
};

const CATEGORY_LABEL_FR: Record<string, string> = {
  water_leak: "Fuite d'eau",
  plumbing: "Plomberie",
  heating: "Chauffage",
  electrical: "Électricité",
  carpentry: "Menuiserie",
  mold_humidity: "Moisissure / humidité",
  other: "Autre",
};

const CATEGORY_LABEL_EN: Record<string, string> = {
  water_leak: "Water leak",
  plumbing: "Plumbing",
  heating: "Heating",
  electrical: "Electrical",
  carpentry: "Carpentry",
  mold_humidity: "Mold / humidity",
  other: "Other",
};

const ROLE_LABEL_FR: Record<string, string> = {
  staff: "Personnel",
  janitor: "Concierge",
  maintenance_manager: "Gestionnaire entretien",
  worker: "Technicien",
};

const ROLE_LABEL_EN: Record<string, string> = {
  staff: "Staff",
  janitor: "Janitor",
  maintenance_manager: "Maintenance manager",
  worker: "Worker",
};

export function maintenanceStatusLabel(status: string, locale: Locale): string {
  const map = locale === "fr" ? STATUS_LABEL_FR : STATUS_LABEL_EN;
  return map[status] ?? status;
}

export function maintenanceCategoryLabel(category: string, locale: Locale): string {
  const map = locale === "fr" ? CATEGORY_LABEL_FR : CATEGORY_LABEL_EN;
  return map[category] ?? category;
}

export function maintenanceRoleLabel(role: string | null | undefined, locale: Locale): string {
  if (!role) return "—";
  const map = locale === "fr" ? ROLE_LABEL_FR : ROLE_LABEL_EN;
  return map[role] ?? role;
}

export function maintenanceStatusClass(status: string): string {
  const map: Record<string, string> = {
    pending_owner: "admin-status admin-status-collecting",
    declined: "admin-status admin-status-rejected",
    open: "admin-status admin-status-submitted",
    closed: "admin-status admin-status-accepted",
  };
  return map[status] ?? "admin-status admin-status-draft";
}
