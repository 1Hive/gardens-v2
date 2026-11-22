import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/configs/chains", () => ({ chainConfigMap: { 42220: {} } }));
import { GET, POST } from "./route";

const community = "0x215b9ed0182d200563921f46ecbcb86111e9ad6b";
const account = "0x809c9f8dd8ca93a41c3adca4972fa234c28f7714";
const challenge = { action: "challenge", chainId: 42220, community, account };
const signature = `0x${"11".repeat(65)}`;
const id = "a".repeat(64);
const hash = `0x${"bb".repeat(32)}`;
const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/markee/authorize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "192.0.2.10",
      },
      body: JSON.stringify(body),
    }),
  );

describe("Markee activation gateway", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());
  it.each([account, "0x705a58f9c33d0a5be425b87dc34b157c508fe467"])(
    "delegates the GoodDollar challenge for %s to Markee",
    async (authorizer) => {
      const body = { nonce: "123", typedData: { domain: { chainId: 42220 } } };
      fetchMock.mockResolvedValue(Response.json(body, { status: 201 }));
      const response = await post({ ...challenge, account: authorizer });
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual(body);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://www.markee.xyz/api/sdk/v1/community/activate");
      expect(JSON.parse(init.body)).toEqual({
        ...challenge,
        account: authorizer,
      });
      expect(init.headers["X-Forwarded-For"]).toBe("192.0.2.10");
      expect(init.cache).toBe("no-store");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    },
  );
  it("retains legacy result fields alongside durable completed operations", async () => {
    const result = {
      authorized: true,
      transactionHash: hash,
      markeeChainId: 8453,
    };
    const operation = { id, status: "complete", result };
    fetchMock.mockResolvedValue(Response.json(operation));
    const response = await post({ action: "verify", nonce: "123", signature });
    expect(await response.json()).toEqual({ ...result, operation });
  });
  it.each(["working", "submitted", "failed"])(
    "preserves %s operations without claiming confirmation",
    async (status) => {
      const operation = {
        id,
        status,
        ...(status === "submitted" ?
          { result: { transactionHash: hash } }
        : {}),
      };
      fetchMock.mockResolvedValue(Response.json(operation));
      const body = await (
        await post({ action: "verify", nonce: "123", signature })
      ).json();
      expect(body.operation).toEqual(operation);
      expect(body.authorized).not.toBe(true);
      expect(fetchMock).toHaveBeenCalledOnce();
    },
  );
  it("recovers operation status with a GET to Markee", async () => {
    const operation = {
      id,
      status: "submitted",
      result: { transactionHash: hash },
    };
    fetchMock.mockResolvedValue(Response.json(operation));
    const response = await GET(
      new Request(`http://localhost/api/markee/authorize?operationId=${id}`),
    );
    expect(await response.json()).toEqual(operation);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://www.markee.xyz/api/sdk/v1/operations/${id}`,
    );
    expect(fetchMock.mock.calls[0][1].method).toBeUndefined();
  });
  it("checks permissions using Markee's current snapshot", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ community: { permissions: { canActivate: true } } }),
    );
    const response = await GET(
      new Request(
        `http://localhost/api/markee/authorize?chainId=42220&community=${community}&account=${account}`,
      ),
    );
    expect(await response.json()).toEqual({ isKeeper: true });
    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.pathname).toBe("/api/sdk/v1/snapshot");
    expect(JSON.parse(url.searchParams.get("placement")!)).toMatchObject({
      kind: "gardens-community",
      chainId: 42220,
    });
  });
  it("treats absent optional permissions as disabled", async () => {
    fetchMock.mockResolvedValue(Response.json({ community: {} }));
    expect(
      await (
        await GET(
          new Request(
            `http://localhost/api/markee/authorize?chainId=42220&community=${community}&account=${account}`,
          ),
        )
      ).json(),
    ).toEqual({ isKeeper: false });
  });
  it.each([401, 403, 409, 429, 503])(
    "preserves upstream HTTP %s errors",
    async (status) => {
      fetchMock.mockResolvedValue(
        Response.json({ error: "upstream error" }, { status }),
      );
      const response = await post(challenge);
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error: "upstream error" });
    },
  );
  it("does not retry a verification after an upstream timeout", async () => {
    fetchMock.mockRejectedValue(new Error("timeout"));
    expect(
      (await post({ action: "verify", nonce: "123", signature })).status,
    ).toBe(502);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it.each([
    { ...challenge, chainId: 9 },
    { action: "verify", nonce: "0", signature },
    { action: "verify", nonce: "123", signature: "bad" },
    { action: "delete" },
  ])("rejects invalid inputs without upstream work: %j", async (body) => {
    expect((await post(body)).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects oversized streamed bodies", async () => {
    expect(
      (await post({ ...challenge, padding: "x".repeat(17000) })).status,
    ).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("does not allow arbitrary URLs in operation identifiers", async () => {
    expect(
      (
        await GET(
          new Request(
            "http://localhost/api/markee/authorize?operationId=https://example.com",
          ),
        )
      ).status,
    ).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
