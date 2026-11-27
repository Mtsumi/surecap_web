import { describe, expect, it } from "vitest";
import type { AdminUser } from "./adminApi";
import {
  adminHomePath,
  applicationsBuildingScope,
  buildingsForApplicationsUser,
  buildingsForMaintenanceUser,
  canAccessApplications,
  canAccessMaintenance,
  isApplicationsPlusMaintenanceNav,
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
  it("allows super admin and maintenance roles for maintenance", () => {
    expect(canAccessMaintenance(baseUser({ is_super_admin: true }))).toBe(true);
    expect(canAccessMaintenance(baseUser({ maintenance_role: "staff" }))).toBe(true);
    expect(canAccessMaintenance(baseUser({}))).toBe(false);
    expect(canAccessMaintenance(baseUser({ active: false, maintenance_role: "staff" }))).toBe(
      false
    );
  });

  it("gates applications per Steve (APM+PA yes; staff/MM/worker no)", () => {
    expect(canAccessApplications(baseUser({}))).toBe(true);
    expect(canAccessApplications(baseUser({ is_super_admin: true }))).toBe(true);
    expect(
      canAccessApplications(baseUser({ maintenance_role: "assistant_property_manager" }))
    ).toBe(true);
    expect(
      canAccessApplications(
        baseUser({ maintenance_role: "property_administrator", janitor_building_ids: [1] })
      )
    ).toBe(true);
    expect(canAccessApplications(baseUser({ maintenance_role: "staff" }))).toBe(false);
    expect(canAccessApplications(baseUser({ maintenance_role: "maintenance_manager" }))).toBe(
      false
    );
    expect(canAccessApplications(baseUser({ maintenance_role: "worker" }))).toBe(false);
  });

  it("maintenance-only is staff/MM/worker only", () => {
    expect(isMaintenanceOnlyUser(baseUser({ maintenance_role: "staff" }))).toBe(true);
    expect(isMaintenanceOnlyUser(baseUser({ maintenance_role: "worker" }))).toBe(true);
    expect(
      isMaintenanceOnlyUser(baseUser({ maintenance_role: "property_administrator" }))
    ).toBe(false);
    expect(
      isMaintenanceOnlyUser(baseUser({ is_super_admin: true, maintenance_role: "staff" }))
    ).toBe(false);
    expect(isMaintenanceOnlyUser(baseUser({}))).toBe(false);
  });

  it("PA/APM get applications+maintenance nav", () => {
    expect(
      isApplicationsPlusMaintenanceNav(baseUser({ maintenance_role: "property_administrator" }))
    ).toBe(true);
    expect(
      isApplicationsPlusMaintenanceNav(
        baseUser({ maintenance_role: "assistant_property_manager" })
      )
    ).toBe(true);
    expect(isApplicationsPlusMaintenanceNav(baseUser({ maintenance_role: "staff" }))).toBe(
      false
    );
    expect(isApplicationsPlusMaintenanceNav(baseUser({ is_super_admin: true }))).toBe(false);
  });

  it("adminHomePath routes by role", () => {
    expect(adminHomePath(baseUser({}))).toBe("/admin/applications");
    expect(
      adminHomePath(baseUser({ maintenance_role: "property_administrator" }))
    ).toBe("/admin/applications");
    expect(adminHomePath(baseUser({ maintenance_role: "worker" }))).toBe(
      "/admin/maintenance"
    );
    expect(adminHomePath(baseUser({ must_change_password: true }))).toBe(
      "/admin/account?required=1"
    );
  });

  it("filters janitor buildings for maintenance and applications", () => {
    const buildings = [
      { id: 1, name: "A" },
      { id: 2, name: "B" },
    ];
    const janitor = baseUser({
      maintenance_role: "janitor",
      janitor_building_ids: [2],
    });
    expect(buildingsForMaintenanceUser(janitor, buildings)).toEqual([{ id: 2, name: "B" }]);
    expect(buildingsForApplicationsUser(janitor, buildings)).toEqual([{ id: 2, name: "B" }]);
    expect(buildingsForMaintenanceUser(baseUser({ maintenance_role: "staff" }), buildings)).toEqual(
      buildings
    );
    expect(
      buildingsForApplicationsUser(
        baseUser({ maintenance_role: "assistant_property_manager" }),
        buildings
      )
    ).toEqual(buildings);
    expect(applicationsBuildingScope(janitor)).toEqual([2]);
    expect(
      applicationsBuildingScope(baseUser({ maintenance_role: "assistant_property_manager" }))
    ).toBeNull();
  });
});
