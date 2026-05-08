import { testWithSynpress } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";
import type { Page } from "@playwright/test";
import { metaMaskFixtures } from "./utils";
import basicSetup from "../wallet-setup/basic.setup";
import {
  confirmTransaction,
  connectWallet,
  expectNoErrorToast,
  getConnectedAccount,
  waitForMemberPowerActive,
} from "./utils";
import { getByTestId } from "./utils";
import { getConfig } from "./utils";

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test.setTimeout(300000);

async function fetchLatestEnabledStrategyWithProposal({
  graphUrl,
  communityId,
}: {
  graphUrl: string;
  communityId: string;
}) {
  return fetch(graphUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `{
  cvstrategies(
    first: 5
    orderBy: poolId
    orderDirection: desc
    where: {isEnabled: true, archived: false, registryCommunity:"${communityId.toLowerCase()}"}
  ) {
    id
    poolId
    proposals(first: 1, orderBy: proposalNumber, orderDirection: desc) {
      id
    }
  }
}`,
    }),
  }).then((r) => r.json());
}

async function waitForPoolVotingReady({
  page,
  metamask,
  extensionId,
  communityId,
  strategyAddress,
  account,
}: {
  page: Page;
  metamask: MetaMask;
  extensionId: string;
  communityId: `0x${string}`;
  strategyAddress: `0x${string}`;
  account: `0x${string}`;
}) {
  const activateBtn = getByTestId(page, "btn-activate-governance");
  const voteBtn = getByTestId(page, "btn-vote-on-proposals");
  const connectBtn = getByTestId(page, "connectButton");
  const deactivateBtn = page.getByRole("button", {
    name: "Deactivate governance",
  });

  for (let attempt = 0; attempt < 30; attempt++) {
    const voteVisible = await voteBtn
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    const voteEnabled =
      voteVisible &&
      (await voteBtn.isEnabled({ timeout: 1000 }).catch(() => false));

    if (voteEnabled) {
      return;
    }

    const activateVisible = await activateBtn
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    const activateEnabled =
      activateVisible &&
      (await activateBtn.isEnabled({ timeout: 1000 }).catch(() => false));

    if (activateEnabled) {
      await activateBtn.click();
      await confirmTransaction({ metamask, extensionId });
      await page.bringToFront();
      await expectNoErrorToast(page);
      await waitForMemberPowerActive({
        page,
        community: communityId,
        strategy: strategyAddress,
        account,
      });
      continue;
    }

    const hasKnownPoolAction =
      voteVisible ||
      activateVisible ||
      (await deactivateBtn.isVisible({ timeout: 1000 }).catch(() => false)) ||
      (await connectBtn.isVisible({ timeout: 1000 }).catch(() => false));

    if (!hasKnownPoolAction && attempt > 0 && attempt % 6 === 0) {
      await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
    } else {
      await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(
        () => {},
      );
    }

    await page.waitForTimeout(3000);
  }

  await expect(voteBtn).toBeVisible({ timeout: 60000 });
  await expect(voteBtn).toBeEnabled({ timeout: 60000 });
}

test("should allocate support to a proposal", async ({
  context,
  page,
  metamaskPage,
  extensionId,
}) => {
  const metamask = new MetaMask(
    context,
    metamaskPage,
    basicSetup.walletPassword,
    extensionId,
  );

  await page.bringToFront();
  await connectWallet(page, metamask);
  await page.bringToFront();

  const { chainId, communityId, subgraphUrl } = getConfig();
  const graphUrl = subgraphUrl;
  let strategyWithProposal:
    | { id: `0x${string}`; proposals?: { id: string }[] }
    | undefined;
  await expect
    .poll(
      async () => {
        const response = await fetchLatestEnabledStrategyWithProposal({
          graphUrl,
          communityId,
        });
        strategyWithProposal = response.data?.cvstrategies?.find(
          (strategy: { proposals?: { id: string }[] }) =>
            strategy.proposals?.length,
        );
        return strategyWithProposal;
      },
      {
        timeout: 180000,
        intervals: [1000, 2000, 3000, 5000],
      },
    )
    .not.toBeUndefined();
  const { id: strategyAddress } = strategyWithProposal!;
  const account = await getConnectedAccount(page);

  await waitForMemberPowerActive({
    page,
    community: communityId,
    strategy: strategyAddress,
    account,
  });

  await page.goto(`/gardens/${chainId}/${communityId}/${strategyAddress}`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });

  const voteBtn = getByTestId(page, "btn-vote-on-proposals");
  await waitForPoolVotingReady({
    page,
    metamask,
    extensionId,
    communityId,
    strategyAddress,
    account,
  });
  await voteBtn.click();

  // Fill the slider for the first proposal
  const slider = getByTestId(page, "input-slider-vote");
  await expect(slider).toBeVisible({ timeout: 30000 });
  const box = await slider.boundingBox();
  await page.mouse.click(box!.x + box!.width * 0.1, box!.y + box!.height / 2);
  await page.waitForTimeout(1000);

  // Submit the vote
  const submitBtn = page.getByText("Submit your vote");
  await expect(submitBtn).toBeVisible({ timeout: 30000 });
  await submitBtn.click();

  await confirmTransaction({ metamask, extensionId });
  await expectNoErrorToast(page);
});
