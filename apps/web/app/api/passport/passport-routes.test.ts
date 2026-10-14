import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getSigningMessage } from "./sign-message/route";
import { POST as submitPassport } from "./submit-passport/route";

const account = "0x1234567890abcdef1234567890abcdef12345678";
const apiKey = "passport-test-key";

describe("Passport API proxy routes", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("GITCOIN_PASSPORT_API_KEY", apiKey);
    vi.stubEnv("SCORER_ID", "42");
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it("requests a signing message from the current Passport host", async () => {
    fetchMock.mockResolvedValue(Response.json({ nonce: "test-nonce" }));

    const response = await getSigningMessage();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ nonce: "test-nonce" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.passport.xyz/registry/signing-message",
      {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        method: "GET",
      },
    );
  });

  it("submits an address to the current Passport host", async () => {
    fetchMock.mockResolvedValue(Response.json({ score: "21.75" }));

    const response = await submitPassport(
      new Request("http://localhost/api/passport/submit-passport", {
        body: JSON.stringify({ address: account }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ score: "21.75" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.passport.xyz/registry/submit-passport",
      {
        body: JSON.stringify({ address: account, scorer_id: "42" }),
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        method: "POST",
      },
    );
  });
});
