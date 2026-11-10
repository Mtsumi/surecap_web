import type { MaintenanceTicket } from "./adminApi";

/** Open (and legacy acknowledged) with no worker — MM assign queue. */
export function isUnassignedMaintenanceTicket(ticket: MaintenanceTicket): boolean {
  if (ticket.assigned_worker_id != null) return false;
  return ticket.status === "open" || ticket.status === "acknowledged";
}

export type MaintenanceListSectionKey = "unassigned" | "other";

export function partitionMaintenanceList(tickets: MaintenanceTicket[]): {
  unassigned: MaintenanceTicket[];
  other: MaintenanceTicket[];
} {
  const unassigned: MaintenanceTicket[] = [];
  const other: MaintenanceTicket[] = [];
  for (const ticket of tickets) {
    if (isUnassignedMaintenanceTicket(ticket)) unassigned.push(ticket);
    else other.push(ticket);
  }
  return { unassigned, other };
}
