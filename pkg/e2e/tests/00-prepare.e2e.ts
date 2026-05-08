import { testWithSynpress } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";
import basicSetup from "../wallet-setup/basic.setup";
import {
  confirmTransaction,
  connectWallet,
  expectNoErrorToast,
  metaMaskFixtures,
  getByTestId,
  gotoE2ECommunity,
  archivePools,
} from "./utils";

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test.setTimeout(600000);

test("should ensure wallet is not a member before running e2e flow", async ({
  context,
  page,
  metamaskPage,
  extensionId,
}) => {
  await archivePools();

  const metamask = new MetaMask(
    context,
    metamaskPage,
    basicSetup.walletPassword,
    extensionId,
  );

  await page.addInitScript(() => {
    localStorage.setItem("flag_showArchived", "true");
    localStorage.setItem("flag_queryAllChains", "true");
  });

  await page.goto("/", { timeout: 60000 });
  await connectWallet(page, metamask);

  await page.evaluate(async () => {
    const provider = (window as any).ethereum;
    if (!provider) {
      throw new Error("Missing injected ethereum provider");
    }
    await provider.request({ method: "eth_chainId" });
  });

  await gotoE2ECommunity(page);
  await page.waitForLoadState("networkidle");

  // If already a member, leave via UI to reset state
  const regBtn = getByTestId(page, "register-member-button");
  const isLeaveVisible = await regBtn
    .getByText("Leave")
    .isVisible()
    .catch(() => false);
  if (isLeaveVisible) {
    await regBtn.getByText("Leave").click();
    await page.waitForTimeout(800);
    await confirmTransaction({ metamask, extensionId });
    await expectNoErrorToast(page);
    // Wait for UI to reflect non-member (button should switch to Join)
    await expect(regBtn.getByText("Join")).toBeVisible({ timeout: 60000 });
  }
});
