import { testWithSynpress } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";
import { metaMaskFixtures } from "./utils";
import basicSetup from "../wallet-setup/basic.setup";
import {
  approveTokenAllowance,
  confirmTransaction,
  connectWallet,
  expectNoErrorToast,
} from "./utils";
import { getByTestId } from "./utils";
import { getConfig } from "./utils";
import { proposalTestConfig } from "./proposal-test-config";
const test = testWithSynpress(metaMaskFixtures(basicSetup));

const { expect } = test;

// Give the flow extra breathing room; MetaMask + subgraph responses can be slow
test.setTimeout(240000);

// Define a basic test case
test("should create a proposal in the pool", async ({
  context,
  page,
  metamaskPage,
  extensionId,
}) => {
  // Create a new MetaMask instance
  const metamask = new MetaMask(
    context,
    metamaskPage,
    basicSetup.walletPassword,
    extensionId,
  );

  await page.bringToFront();
  await await connectWallet(page, metamask);

  const { chainId, communityId, subgraphUrl } = getConfig();
  const graphUrl = subgraphUrl;
  const subgraphRes = await fetch(graphUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `{ cvstrategies(first: 1, orderBy: poolId, orderDirection: desc, where: { isEnabled: true, registryCommunity: "${communityId.toLowerCase()}" }) { id poolId } }`,
    }),
  }).then((r) => r.json());
  const { id: strategyAddress } = subgraphRes.data.cvstrategies[0];
  console.log("subgraph RESP", subgraphRes);
  await page.goto(
    `/gardens/${chainId}/${communityId}/${strategyAddress}/create-proposal`,
    { timeout: 60000 },
  );

  await page.waitForTimeout(2000); // Wait for tx to succeed and UI to update

  // await page.bringToFront();
  // await page.waitForTimeout(2000); // Wait for tx to succeed and UI to update
  // const selectAllBtn = page.getByTestId("btn-select-all");
  // await selectAllBtn.click();
  // // Find the first pending pool card and navigate to it
  // const poolCard = page.locator('[data-testid^="pool-card-approved"]').first();
  // await expect(poolCard).toBeVisible({ timeout: 30000 });
  // await poolCard.click();
  // await page.waitForTimeout(2000);

  // // Approve the pool
  // const addNewProposalBtn = page.getByTestId("btn-add-proposal");
  // await expect(addNewProposalBtn).toBeVisible({ timeout: 30000 });
  // await addNewProposalBtn.click();

  const amountInput = getByTestId(page, "input-requested-amount");
  await expect(amountInput).toBeVisible({ timeout: 60000 });
  const descriptionInput = getByTestId(
    page,
    "input-proposal-description",
  ).locator('[contenteditable="true"]');
  const tokenAddressInput = getByTestId(page, "input-beneficiary-address");
  const titleInput = getByTestId(page, "input-proposal-title");

  // Fill all inputs
  await amountInput.fill(proposalTestConfig.requestedAmount);
  await descriptionInput.fill(proposalTestConfig.description);
  const beneficiary = await page.evaluate(async () => {
    const provider = (window as any).ethereum;
    const accounts = (await provider.request({
      method: "eth_accounts",
    })) as string[];
    return accounts[0] ?? "";
  });
  await tokenAddressInput.fill(beneficiary);
  await titleInput.fill(proposalTestConfig.title);

  await getByTestId(page, "btn-preview-proposal").click();
  // const submitBtn = getByTestId(page, "")
  await getByTestId(page, "btn-submit-proposal").click();

  await confirmTransaction({ metamask, extensionId });
  await expectNoErrorToast(page);
});
