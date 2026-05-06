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
  getConfig
} from "./utils";

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test.setTimeout(240000);

const isAddress = (value: string | undefined): value is `0x${string}` =>
  typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);

test("should ensure wallet is not a member before running e2e flow", async ({
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

  await page.addInitScript(() => {
    localStorage.setItem("flag_showArchived", "true");
    localStorage.setItem("flag_queryAllChains", "true");
  });

  await page.goto("/", { timeout: 60000 });
  await connectWallet(page, metamask);

  const chainId = await page.evaluate(async () => {
    const provider = (window as any).ethereum;
    if (!provider) {
      throw new Error("Missing injected ethereum provider");
    }
    return (await provider.request({ method: "eth_chainId" })) as string;
  });

  const account = await page.evaluate(async () => {
    const provider = (window as any).ethereum;
    const accounts = (await provider.request({
      method: "eth_accounts"
    })) as string[];
    return accounts[0] ?? null;
  });

  if (!isAddress(account)) {
    throw new Error("Connected wallet account is missing or invalid.");
  }

  const { communityId } = getConfig();
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
