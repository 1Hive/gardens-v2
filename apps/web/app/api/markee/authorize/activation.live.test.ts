import { describe, expect, it, vi } from "vitest";
vi.mock("@/configs/chains", () => ({ chainConfigMap: { 42220: {} } }));
import { GET, POST } from "./route";

// Opt-in deployment smoke test. Never signs or broadcasts a transaction.
// MARKEE_LIVE_ACTIVATION_TEST=true pnpm exec vitest run app/api/markee/authorize/activation.live.test.ts
const API = "http://gardens.test/api/markee/authorize";
const community = "0x215b9ed0182d200563921f46ecbcb86111e9ad6b";
const owner = "0x809c9f8dd8ca93a41c3adca4972fa234c28f7714";
const safe = "0x705a58f9c33d0a5be425b87dc34b157c508fe467";
async function post(body: unknown) {
  const response = await POST(
    new Request(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return { response, body: await response.json() };
}
describe.skipIf(process.env.MARKEE_LIVE_ACTIVATION_TEST !== "true")(
  "Gardens gateway against the deployed Markee activation API",
  () => {
    it.each([
      [owner, "councilOwner"],
      [safe, "councilSafe"],
    ])(
      "issues a scoped challenge for %s and rejects invalid signatures",
      async (account, role) => {
        const challenge = await post({
          action: "challenge",
          chainId: 42220,
          community,
          account,
        });
        expect(challenge.response.status, JSON.stringify(challenge.body)).toBe(
          201,
        );
        expect(challenge.body.authorizationRole).toBe(role);
        expect(challenge.body.typedData.domain.chainId).toBe(42220);
        expect(
          challenge.body.typedData.domain.verifyingContract.toLowerCase(),
        ).toBe(community);
        expect(challenge.body.nonce).toMatch(/^[1-9][0-9]*$/u);
        // Deliberately invalid signature: exercise the real nonce/operation store,
        // but never supply an authorization capable of creating a transaction.
        const rejected = await post({
          action: "verify",
          nonce: challenge.body.nonce,
          signature: `0x${"00".repeat(65)}`,
        });
        expect(rejected.response.status).toBe(200);
        expect(rejected.body.operation.status).toBe("failed");
        expect(rejected.body.operation.result?.transactionHash).toBeUndefined();
        const status = await GET(
          new Request(`${API}?operationId=${rejected.body.operation.id}`),
        );
        expect((await status.json()).status).toBe("failed");
      },
      60_000,
    );
    it("refuses an unrelated wallet", async () => {
      const rejected = await post({
        action: "challenge",
        chainId: 42220,
        community,
        account: "0x1111111111111111111111111111111111111111",
      });
      expect(rejected.response.status).toBe(403);
    }, 30_000);
  },
);
