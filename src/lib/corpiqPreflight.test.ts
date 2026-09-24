import { describe, expect, it } from "vitest";
import {
  corpiqPortalPreflightIssues,
  corpiqPreflightOk,
  hasCreditConsentDocument,
} from "./corpiqPreflight";
import type { ApplicationMember } from "./adminApi";

function member(partial: Partial<ApplicationMember>): ApplicationMember {
  return {
    id: 1,
    application_id: 1,
    role: "primary",
    member_status: "complete",
    invited_name: null,
    invited_email: null,
    given_name: "Jane",
    family_name: "Doe",
    date_of_birth: "1990-05-01",
    email: null,
    phone: null,
    current_address: "3400 Avenue Linton, Montréal, QC H3S 1J1",
    previous_address: null,
    current_address_lived_from: null,
    current_address_lived_to: null,
    previous_address_lived_from: null,
    previous_address_lived_to: null,
    address_not_in_canada: null,
    lease_in_name: null,
    move_in_date: null,
    landlord_phone: null,
    hr_phone: null,
    landlord_name: null,
    hr_name: null,
    employer_name: null,
    previous_landlord_phone: null,
    previous_landlord_name: null,
    referral_source: null,
    facebook_url: null,
    linkedin_url: null,
    documents: [
      {
        id: 9,
        application_member_id: 1,
        document_type: "credit_consent",
        original_filename: "consent.pdf",
        content_type: "application/pdf",
        byte_size: 100,
        uploaded_at: "2026-01-01T00:00:00Z",
      },
    ],
    ...partial,
  };
}

describe("corpiqPortalPreflightIssues", () => {
  it("passes when portal fields match backend expectations", () => {
    expect(corpiqPreflightOk(member({}))).toBe(true);
    expect(corpiqPortalPreflightIssues(member({}))).toEqual([]);
  });

  it("flags missing consent, dob, and bad address", () => {
    const issues = corpiqPortalPreflightIssues(
      member({
        date_of_birth: null,
        current_address: "Montreal QC",
        documents: [],
      })
    );
    expect(issues).toContain("missing_dob");
    expect(issues).toContain("missing_consent");
    expect(issues).toContain("missing_postal_code");
    expect(issues).toContain("missing_civic_number");
  });

  it("detects credit consent document type", () => {
    expect(hasCreditConsentDocument(member({ documents: [] }))).toBe(false);
    expect(hasCreditConsentDocument(member({}))).toBe(true);
  });
});
