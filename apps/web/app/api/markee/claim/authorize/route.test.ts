import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/configs/chains", () => ({ chainConfigMap: { 100: {} } }));
import { GET, POST } from "./route";

const community = "0x0000000000000000000000000000000000000001";
const account = "0x0000000000000000000000000000000000000002";
const operationId = "a".repeat(64);
const endpoint = "https://www.markee.xyz/api/sdk/v1";

const post = (body: object) =>
  POST(
    new Request("https://app.gardens.fund/api/markee/claim/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

describe("Markee claim proxy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("forwards a challenge to Markee", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        Response.json({ nonce: "123", typedData: {} }, { status: 201 }),
      );
    const response = await post({
      action: "challenge",
      chainId: 100,
      community,
      account,
    });
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(fetchMock).toHaveBeenCalledWith(
      `${endpoint}/community/claim`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          action: "challenge",
          chainId: 100,
          community,
          account,
        }),
      }),
    );
  });

  it("forwards a signed verification once and passes through its operation", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ id: operationId, status: "working" }));
    const signature = `0x${"11".repeat(65)}`;
    const response = await post({ action: "verify", nonce: "123", signature });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      id: operationId,
      status: "working",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string),
    ).toEqual({ action: "verify", nonce: "123", signature });
  });

  it("recovers status from Markee", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        Response.json({ id: operationId, status: "submitted" }),
      );
    const response = await GET(
      new Request(
        `https://app.gardens.fund/api/markee/claim/authorize?operationId=${operationId}`,
      ),
    );
    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${endpoint}/operations/${operationId}`,
    );
  });

  it("rejects invalid input without contacting Markee", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    expect(
      (
        await post({
          action: "challenge",
          chainId: 100,
          community: "bad",
          account,
        })
      ).status,
    ).toBe(400);
    expect(
      (await post({ action: "verify", nonce: "0", signature: "0x1" })).status,
    ).toBe(400);
    expect(
      (
        await GET(
          new Request(
            "https://app.gardens.fund/api/markee/claim/authorize?operationId=bad",
          ),
        )
      ).status,
    ).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
