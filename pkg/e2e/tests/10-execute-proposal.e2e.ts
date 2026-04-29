import { testWithSynpress } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";
import { metaMaskFixtures } from "./support/metaMaskFixtures";
import basicSetup from "../wallet-setup/basic.setup";
import {
  confirmTransaction,
  connectWallet,
  expectNoErrorToast
} from "./support/metamaskUtils";
import { getByTestId } from "./support/locators-utils";
import {
  createPublicClient,
  createWalletClient,
  erc20Abi,
  http,
  parseUnits
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { optimism } from "viem/chains";

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test.setTimeout(240000);

test("should execute a proposal", async ({
  context,
  page,
  metamaskPage,
  extensionId
}) => {
  const metamask = new MetaMask(
    context,
    metamaskPage,
    basicSetup.walletPassword,
    extensionId
  );

  await page.bringToFront();
  await connectWallet(page, metamask);

  const subgraphRes = await fetch(
    "https://api.studio.thegraph.com/query/102093/gardens-v2---optimism/version/latest",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: `{
  cvstrategies(
    first: 1
    orderBy: poolId
    orderDirection: desc
    where: {isEnabled: true, registryCommunity:"0x9ee73d7afd1d75d9d3468ab7845150180936dec4"}
  ) {
    id
    poolId
    token
  }
}`
      })
    }
  ).then((r) => r.json());
  const {
    id: strategyAddress,
    poolId,
    token: tokenAddress
  } = subgraphRes.data.cvstrategies[0];

  // Fund the pool directly via viem before navigating so the pool has funds
  // const account = mnemonicToAccount(process.env.E2E_WALLET_SEED_PHRASE!);
  // const transport = http("https://mainnet.optimism.io");

  // const publicClient = createPublicClient({ chain: optimism, transport });
  // const walletClient = createWalletClient({
  //   account,
  //   chain: optimism,
  //   transport
  // });

  // const decimals = await publicClient.readContract({
  //   address: tokenAddress,
  //   abi: erc20Abi,
  //   functionName: "decimals"
  // });

  // const txHash = await walletClient.writeContract({
  //   address: tokenAddress,
  //   abi: erc20Abi,
  //   functionName: "transfer",
  //   args: [strategyAddress, parseUnits("0.2", decimals)]
  // });
  // await publicClient.waitForTransactionReceipt({ hash: txHash });
  await page.goto(
    `gardens/10/0x9ee73d7afd1d75d9d3468ab7845150180936dec4/${poolId}`,
    { timeout: 60000 }
  );

  // Find and click the proposal card that is ready to be executed
  const readyCard = page.getByText("Ready to be executed").first();
  await expect(readyCard).toBeVisible({ timeout: 60000 });
  await readyCard.click();

  // Click the Execute button on the proposal detail page
  const executeBtn = getByTestId(page, "btn-execute-proposal");
  await expect(executeBtn).toBeVisible({ timeout: 30000 });
  await executeBtn.click();

  await confirmTransaction({ metamask, extensionId });
  await expectNoErrorToast(page);
});
