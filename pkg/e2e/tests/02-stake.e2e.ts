import { testWithSynpress } from "@synthetixio/synpress";
import {
  createPublicClient,
  createWalletClient,
  http,
  maxUint256,
  parseAbi,
  parseUnits,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import basicSetup from "../wallet-setup/basic.setup";
import { createE2EChain, getConfig, metaMaskFixtures } from "./utils";

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test.setTimeout(240000);

const stakeAmount = "0.1";

const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);
const registryCommunityAbi = parseAbi([
  "function getMemberStakedAmount(address member) view returns (uint256)",
  "function increasePower(uint256 amount)",
]);

test("should increase stake in community", async () => {
  const { chainId, communityId, governanceToken, rpcUrl, walletSeedPhrase } =
    getConfig();
  const chain = createE2EChain();
  const account = mnemonicToAccount(walletSeedPhrase);
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  const allowance = await publicClient.readContract({
    address: governanceToken,
    abi: erc20Abi,
    functionName: "allowance",
    args: [account.address, communityId],
  });
  if (allowance === 0n) {
    const approveHash = await walletClient.writeContract({
      address: governanceToken,
      abi: erc20Abi,
      functionName: "approve",
      args: [communityId, maxUint256],
    });
    const approveReceipt = await publicClient.waitForTransactionReceipt({
      hash: approveHash,
      confirmations: 1,
      timeout: 180000,
    });
    expect(approveReceipt.status).toBe("success");
  }

  const decimals = Number(
    await publicClient.readContract({
      address: governanceToken,
      abi: erc20Abi,
      functionName: "decimals",
    }),
  );
  const amount = parseUnits(stakeAmount, decimals);
  const initialStake = await publicClient.readContract({
    address: communityId,
    abi: registryCommunityAbi,
    functionName: "getMemberStakedAmount",
    args: [account.address],
  });

  const stakeHash = await walletClient.writeContract({
    address: communityId,
    abi: registryCommunityAbi,
    functionName: "increasePower",
    args: [amount],
  });
  const stakeReceipt = await publicClient.waitForTransactionReceipt({
    hash: stakeHash,
    confirmations: 1,
    timeout: 180000,
  });
  expect(stakeReceipt.status).toBe("success");

  await expect
    .poll(
      async () => {
        return publicClient.readContract({
          address: communityId,
          abi: registryCommunityAbi,
          functionName: "getMemberStakedAmount",
          args: [account.address],
        });
      },
      {
        timeout: 180000,
        intervals: [1000, 2000, 3000, 5000],
      },
    )
    .toBeGreaterThanOrEqual(initialStake + amount);
});
