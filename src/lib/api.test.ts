import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function mockFetch(body: unknown, init?: { ok?: boolean; statusText?: string }) {
  const ok = init?.ok ?? true;
  return vi.fn().mockResolvedValue({
    ok,
    statusText: init?.statusText ?? "OK",
    json: async () => body,
  });
}

describe("api client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("unwraps success envelopes", async () => {
    const fetchMock = mockFetch({
      status: "success",
      message: "ok",
      data: [{ id: 1, name: "Tower", address: "1 Main", latitude: null, longitude: null }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchBuildings } = await import("./api");
    const buildings = await fetchBuildings();

    expect(buildings).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/buildings",
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      })
    );
  });

  it("throws on API error envelopes", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({ status: "error", message: "Unit not found", data: null }, { ok: false })
    );

    const { fetchUnits } = await import("./api");
    await expect(fetchUnits(99)).rejects.toThrow("Unit not found");
  });

  it("throws on empty success payloads", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({ status: "success", message: "No data", data: null })
    );

    const { fetchBuildings } = await import("./api");
    await expect(fetchBuildings()).rejects.toThrow("No data");
  });

  it("adds ngrok header when API URL uses ngrok", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://example.ngrok-free.app");
    const fetchMock = mockFetch({
      status: "success",
      message: "ok",
      data: [],
    });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchBuildings } = await import("./api");
    await fetchBuildings();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.ngrok-free.app/buildings",
      expect.objectContaining({
        headers: expect.objectContaining({
          "ngrok-skip-browser-warning": "1",
        }),
      })
    );
  });

  it("POSTs invite submit to the encoded token path", async () => {
    const fetchMock = mockFetch({
      status: "success",
      message: "ok",
      data: {
        application_id: 1,
        member_id: 2,
        role: "roommate",
        member_status: "submitted",
        application_status: "collecting",
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    const { submitInvite } = await import("./api");
    await submitInvite("token/with/slash", { given_name: "A", family_name: "B" } as never);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/applications/invites/token%2Fwith%2Fslash/submit",
      expect.objectContaining({ method: "POST" })
    );
  });
});
