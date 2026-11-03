import type { AdminNotification } from "./adminApi";

export function notificationHref(item: Pick<AdminNotification, "entity_type" | "entity_id">): string {
  if (item.entity_type === "maintenance_ticket") {
    return `/admin/maintenance/${item.entity_id}`;
  }
  return "/admin/notifications";
}
