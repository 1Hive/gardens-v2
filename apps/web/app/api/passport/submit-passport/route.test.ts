import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchPassportScoreRecord: vi.fn() }));
vi.mock("../../../../utils/gitcoin-passport", () => ({
  fetchPassportScoreRecord: mocks.fetchPassportScoreRecord,
  getEffectivePassportScore: (score: { score: string }) => Number(score.score),
}));
import { POST } from "./route";

const address = "0x0000000000000000000000000000000000000001";
const request = (body: unknown) =>
  new Request("https://app.gardens.fund/api/passport/submit-passport", {
    method: "POST",
    body: JSON.stringify(body),
  });

beforeEach(() => vi.resetAllMocks());

it("keeps the Gardens response shape while reading the Passport v2 scorer", async () => {
  mocks.fetchPassportScoreRecord.mockResolvedValue({
    address,
    score: "20",
    error: null,
  });
  const response = await POST(request({ address }));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toMatchObject({ address, score: "20" });
  expect(mocks.fetchPassportScoreRecord).toHaveBeenCalledWith(address);
});

it("rejects invalid addresses before calling Passport", async () => {
  expect((await POST(request({ address: "bad" }))).status).toBe(400);
  expect(mocks.fetchPassportScoreRecord).not.toHaveBeenCalled();
});
