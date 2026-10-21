import { randomUUID } from "node:crypto";
import {
  createWalletClient,
  encodeAbiParameters,
  getAddress,
  Hex,
  http,
  isAddress,
  keccak256,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  deliveryABI,
  deliveryBalance,
  getCommunityDeliveryVault,
  getDeliveryAdapter,
} from "./markeeDelivery";
import {
  acquireMarkeeDeliveryLease,
  releaseMarkeeDeliveryLease,
  renewMarkeeDeliveryLease,
} from "@/utils/markeeChallengeStore";
import {
  getEnvPublicClient,
  getRpcUrlForChain,
  resolveClientChain,
} from "@/utils/publicClient";

export async function runMarkeeDeliveryKeeper() {
  // Vercel previews must never spend from a production delivery signer.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production")
    return { status: "disabled", deliveries: [] };
  const adapter = getDeliveryAdapter();
  if (!adapter) return { status: "disabled", deliveries: [] };
  const communities: unknown = JSON.parse(
    process.env.MARKEE_GNOSIS_DELIVERY_COMMUNITIES ?? "[]",
  );
  if (
    !Array.isArray(communities) ||
    communities.length > 3 ||
    communities.some((c) => typeof c !== "string" || !isAddress(c))
  )
    throw new Error(
      "Configure up to three Gnosis delivery communities per pilot run.",
    );
  if (!communities.length)
    throw new Error("No Gnosis delivery communities configured.");
  const key = process.env.MARKEE_DELIVERY_KEEPER_PK?.trim();
  if (!key || !/^0x[\da-f]{64}$/iu.test(key))
    throw new Error("Dedicated delivery keeper is not configured.");
  const account = privateKeyToAccount(key as Hex);
  const lease = randomUUID();
  if (!(await acquireMarkeeDeliveryLease(lease)))
    return { status: "busy", deliveries: [] };
  const deliveries: Array<{ community: string; status: string; hash?: Hex }> =
    [];
  try {
    const client = getEnvPublicClient(100);
    const wallet = createWalletClient({
      account,
      chain: resolveClientChain(100),
      transport: http(getRpcUrlForChain(100), {
        retryCount: 0,
        timeout: 20_000,
      }),
    });
    for (const raw of [...new Set(communities as string[])]) {
      const community = getAddress(raw);
      const communityKey = keccak256(
        encodeAbiParameters(
          [{ type: "uint256" }, { type: "address" }],
          [100n, community],
        ),
      );
      const vault = await getCommunityDeliveryVault(
        adapter,
        communityKey,
        community,
      );
      if ((await deliveryBalance(vault)) < 1_000_000_000_000n) {
        deliveries.push({ community, status: "below_threshold" });
        continue;
      }
      const latest = await client.getTransactionCount({
        address: account.address,
        blockTag: "latest",
      });
      if (
        (await client.getTransactionCount({
          address: account.address,
          blockTag: "pending",
        })) !== latest
      )
        throw new Error(
          "Delivery signer has a pending transaction; wait for confirmation.",
        );
      const simulation = await client.simulateContract({
        address: vault,
        abi: deliveryABI,
        functionName: "deliver",
        account,
      });
      const gas =
        ((await client.estimateContractGas(simulation.request)) * 125n) / 100n;
      const gasPrice = (await client.getGasPrice()) * 2n;
      if (
        gas * gasPrice > 20_000_000_000_000_000n ||
        (await client.getBalance({ address: account.address })) <
          gas * gasPrice + 100_000_000_000_000_000n
      )
        throw new Error("Delivery keeper gas limit or reserve check failed.");
      if (!(await renewMarkeeDeliveryLease(lease)))
        throw new Error("Delivery lease expired; no transaction submitted.");
      const hash = await wallet.writeContract({
        address: vault,
        abi: deliveryABI,
        functionName: "deliver",
        nonce: latest,
        gas,
        gasPrice,
      });
      // If receipt waiting fails, do not resubmit here. The next run checks nonce
      // and vault balance. deliver() can only forward to the live council Safe.
      const receipt = await client.waitForTransactionReceipt({
        hash,
        timeout: 45_000,
        confirmations: 2,
      });
      if (receipt.status !== "success")
        throw new Error(`Delivery reverted: ${hash}`);
      deliveries.push({ community, status: "delivered", hash });
    }
    return { status: "complete", deliveries };
  } finally {
    await releaseMarkeeDeliveryLease(lease);
  }
}
