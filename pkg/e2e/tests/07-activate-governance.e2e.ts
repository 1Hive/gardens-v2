import { testWithSynpress } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";
import { metaMaskFixtures } from "./utils";
import basicSetup from "../wallet-setup/basic.setup";
import { confirmTransaction, connectWallet, expectNoErrorToast } from "./utils";
import { getByTestId } from "./utils";
import { getConfig } from "./utils";

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test.setTimeout(240000);

test("should activate governance in the pool", async ({
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

  const { chainId, communityId, subgraphUrl } = getConfig();
  const graphUrl = subgraphUrl;
  const subgraphRes = await fetch(graphUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `{ cvstrategies(first: 1, orderBy: poolId, orderDirection: desc, where: { isEnabled: true, registryCommunity: "${communityId.toLowerCase()}" }) { id poolId } }`
    })
  }).then((r) => r.json());
  const { id: strategyAddress } = subgraphRes.data.cvstrategies[0];

  await page.goto(`/gardens/${chainId}/${communityId}/${strategyAddress}`, {
    timeout: 60000
  });

  const activateBtn = getByTestId(page, "btn-activate-governance");
  await expect(activateBtn).toBeVisible({ timeout: 60000 });
  await activateBtn.click();

  await confirmTransaction({ metamask, extensionId });
  await expectNoErrorToast(page);
});
