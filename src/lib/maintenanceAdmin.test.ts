import { describe, expect, it } from "vitest";
import type { AdminUser } from "./adminApi";
import {
  buildingsForMaintenanceUser,
  canAccessMaintenance,
  isMaintenanceOnlyUser,
} from "./maintenanceAdmin";

const baseUser = (over: Partial<AdminUser>): AdminUser => ({
  id: 1,
  email: "a@example.com",
  is_super_admin: false,
  active: true,
  must_change_password: false,
  maintenance_role: null,
  janitor_building_ids: null,
  created_at: "",
  updated_at: "",
  ...over,
});

describe("maintenanceAdmin access", () => {
  it("allows super admin and maintenance roles", () => {
    expect(canAccessMaintenance(baseUser({ is_super_admin: true }))).toBe(true);
    expect(canAccessMaintenance(baseUser({ maintenance_role: "staff" }))).toBe(true);
    expect(canAccessMaintenance(baseUser({}))).toBe(false);
    expect(canAccessMaintenance(baseUser({ active: false, maintenance_role: "staff" }))).toBe(
      false
    );
  });

  it("detects maintenance-only users", () => {
    expect(isMaintenanceOnlyUser(baseUser({ maintenance_role: "staff" }))).toBe(true);
    expect(isMaintenanceOnlyUser(baseUser({ is_super_admin: true, maintenance_role: "staff" }))).toBe(
      false
    );
    expect(isMaintenanceOnlyUser(baseUser({}))).toBe(false);
  });

  it("filters janitor buildings", () => {
    const buildings = [{ id: 1, name: "A" }, { id: 2, name: "B" }];
    const janitor = baseUser({
      maintenance_role: "janitor",
      janitor_building_ids: [2],
    });
    expect(buildingsForMaintenanceUser(janitor, buildings)).toEqual([{ id: 2, name: "B" }]);
    expect(buildingsForMaintenanceUser(baseUser({ maintenance_role: "staff" }), buildings)).toEqual(
      buildings
    );
  });
});
