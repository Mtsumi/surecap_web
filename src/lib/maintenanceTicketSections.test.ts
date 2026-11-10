import { describe, expect, it } from "vitest";
import type { MaintenanceTicket } from "./adminApi";
import {
  isUnassignedMaintenanceTicket,
  partitionMaintenanceList,
} from "./maintenanceTicketSections";

function ticket(partial: Partial<MaintenanceTicket> & Pick<MaintenanceTicket, "id" | "status">): MaintenanceTicket {
  return {
    building_id: 1,
    building_name: "A",
    unit_id: null,
    unit_number: null,
    location_kind: "common_area",
    location_label: "Lobby",
    category: "plumbing",
    urgent: false,
    title: "Leak",
    description: "drip",
    owner_decision: null,
    status_reason: null,
    opened_by_id: 1,
    opened_by_email: "a@b.ca",
    estimated_completion_at: null,
    assigned_worker_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    attachments: [],
    ...partial,
  };
}

describe("maintenanceTicketSections", () => {
  it("treats open without worker as unassigned", () => {
    expect(isUnassignedMaintenanceTicket(ticket({ id: 1, status: "open" }))).toBe(true);
    expect(
      isUnassignedMaintenanceTicket(
        ticket({ id: 2, status: "open", assigned_worker_id: 9 })
      )
    ).toBe(false);
  });

  it("partitions unassigned ahead of the rest", () => {
    const { unassigned, other } = partitionMaintenanceList([
      ticket({ id: 1, status: "open" }),
      ticket({ id: 2, status: "assigned", assigned_worker_id: 3 }),
      ticket({ id: 3, status: "pending_owner" }),
      ticket({ id: 4, status: "acknowledged" }),
    ]);
    expect(unassigned.map((t) => t.id)).toEqual([1, 4]);
    expect(other.map((t) => t.id)).toEqual([2, 3]);
  });
});
