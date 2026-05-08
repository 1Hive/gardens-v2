import { testWithSynpress } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";
import { metaMaskFixtures } from "./utils";
import basicSetup from "../wallet-setup/basic.setup";
import {
  approveTokenAllowance,
  confirmTransaction,
  connectWallet,
  expectNoErrorToast,
  gotoE2ECommunity,
  getByTestId,
  getConfig,
  getConnectedAccount,
  waitForAllowancePositive,
  waitForMembershipActive,
} from "./utils";

const test = testWithSynpress(metaMaskFixtures(basicSetup));

const { expect } = test;

// Give the flow extra breathing room; MetaMask + subgraph responses can be slow
test.setTimeout(240000);

// Define a basic test case
test("should increase stake in community", async ({
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
  await connectWallet(page, metamask);
  await gotoE2ECommunity(page);

  await page.waitForTimeout(2000); // Wait for tx to succeed and UI to update

  // If not a member yet, join via UI here to make the test self-contained
  const regBtn = getByTestId(page, "register-member-button");
  const canJoin = await regBtn
    .getByText("Join")
    .isVisible()
    .catch(() => false);
  if (canJoin) {
    await regBtn.getByText("Join").click();
    await metamask.confirmSignature();
    await approveTokenAllowance({ page, metamask, extensionId });
    await page.getByText("Waiting for signature").isVisible({
      timeout: 60000,
    });
    await confirmTransaction({ metamask, extensionId });
    await expectNoErrorToast(page);
  }

  // Ensure on-chain membership is active (avoid subgraph lag)
  const { communityId } = getConfig();
  const account = await getConnectedAccount(page);

  await waitForMembershipActive({
    page,
    community: communityId,
    account,
  });

  // Reload to let UI reflect indexed membership
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // 5. Stake 0.2 tokens (wait for membership UI to reflect join)
  const stakeInput = getByTestId(page, "stake-input");
  // Wait/poll for stake input to appear — subgraph membership may lag post-join
  let stakeInputVisible = await stakeInput.isVisible().catch(() => false);
  for (let attempt = 0; !stakeInputVisible && attempt < 15; attempt++) {
    // On mobile, ensure Overview tab is selected
    const overviewTab = page.getByRole("tab", { name: "Overview" });
    if (await overviewTab.isVisible().catch(() => false)) {
      await overviewTab.click().catch(() => {});
    }
    const stakeBtn = getByTestId(page, "btn-stake");
    if (await stakeBtn.isVisible().catch(() => false)) {
      await stakeBtn.click().catch(() => {});
      await page.waitForTimeout(1000);
    }
    stakeInputVisible = await stakeInput.isVisible().catch(() => false);
    if (stakeInputVisible) break;
    await page.reload({ waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(4000);
  }

  await expect(stakeInput).toBeVisible({ timeout: 30000 });
  const { min: minAttr, max: maxAttr } = await stakeInput.evaluate((el) => ({
    min: (el as HTMLInputElement).min,
    max: (el as HTMLInputElement).max,
  }));
  const minVal = parseFloat(minAttr || "0");
  const maxVal = parseFloat(maxAttr || "0");
  const pickAmount = () => {
    if (Number.isFinite(maxVal) && maxVal > 0)
      return Math.max(minVal, maxVal * 0.05);
    if (Number.isFinite(minVal) && minVal > 0) return minVal * 1.1;
    return 0.1;
  };
  const amt = pickAmount();
  await stakeInput.fill(amt.toString());

  const stakeBtn = getByTestId(page, "btn-stake");
  await expect(stakeBtn).toBeEnabled({ timeout: 60000 });
  await stakeBtn.click();
  // If a token approval appears before staking, ensure allowance is live
  try {
    const { governanceToken, communityId } = getConfig();
    await waitForAllowancePositive({
      page,
      token: governanceToken,
      spender: communityId,
      timeoutMs: 60000,
    });
  } catch {}

  // Approve token allowance for staking
  await approveTokenAllowance({ page, metamask, extensionId });
  await page.waitForTimeout(1000); // Wait for next tx to launch

  // Confirm the stake transaction
  await confirmTransaction({ metamask, extensionId });
  await expectNoErrorToast(page);
});
