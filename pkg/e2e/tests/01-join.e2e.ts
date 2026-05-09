import { testWithSynpress } from "@synthetixio/synpress";
import {
  Address,
  createPublicClient,
  createWalletClient,
  http,
  maxUint256,
  parseAbi,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import basicSetup from "../wallet-setup/basic.setup";
import {
  createE2EChain,
  getConfig,
  metaMaskFixtures,
  waitForMembershipActive,
} from "./utils";

const test = testWithSynpress(metaMaskFixtures(basicSetup));

test.setTimeout(240000);

const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);
const registryCommunityAbi = parseAbi([
  "function isMember(address account) view returns (bool)",
  "function stakeAndRegisterMember(string covenantSig)",
]);

test("should join community", async ({ page }) => {
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

  const isMember = await publicClient.readContract({
    address: communityId,
    abi: registryCommunityAbi,
    functionName: "isMember",
    args: [account.address],
  });

  if (!isMember) {
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
      await publicClient.waitForTransactionReceipt({
        hash: approveHash,
        confirmations: 1,
        timeout: 180000,
      });
    }

    const joinHash = await walletClient.writeContract({
      address: communityId,
      abi: registryCommunityAbi,
      functionName: "stakeAndRegisterMember",
      args: [""],
    });
    await publicClient.waitForTransactionReceipt({
      hash: joinHash,
      confirmations: 1,
      timeout: 180000,
    });
  }

  await waitForMembershipActive({
    page,
    community: communityId,
    account: account.address as Address,
  });
});
