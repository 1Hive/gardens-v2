import { MetaMask } from "@synthetixio/synpress/playwright";
import { testWithSynpress } from "@synthetixio/synpress";
import basicSetup from "../wallet-setup/basic.setup";
import {
  confirmTransaction,
  connectWallet,
  expectNoErrorToast,
  getConfig,
  metaMaskFixtures,
} from "./utils";

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test.setTimeout(240000);

type Strategy = {
  id: string;
  poolId: string;
};

async function fetchLatestEnabledUnarchivedStrategy() {
  const { communityId, subgraphUrl } = getConfig();
  const response = await fetch(subgraphUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `{
        cvstrategies(
          first: 1
          orderBy: poolId
          orderDirection: desc
          where: {isEnabled: true, archived: false, registryCommunity: "${communityId.toLowerCase()}"}
        ) {
          id
          poolId
        }
      }`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Strategy subgraph query failed: HTTP ${response.status}`);
  }

  const json = (await response.json()) as {
    data?: { cvstrategies?: Strategy[] };
    errors?: { message?: string }[];
  };
  if (json.errors?.length) {
    throw new Error(
      json.errors.map((error) => error.message ?? "unknown error").join("; "),
    );
  }

  return json.data?.cvstrategies?.[0];
}

async function fetchStrategyArchived(strategyId: string) {
  const { subgraphUrl } = getConfig();
  const response = await fetch(subgraphUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `{
        cvstrategy(id: "${strategyId.toLowerCase()}") {
          archived
        }
      }`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Archive subgraph query failed: HTTP ${response.status}`);
  }

  const json = (await response.json()) as {
    data?: { cvstrategy?: { archived?: boolean } };
    errors?: { message?: string }[];
  };
  if (json.errors?.length) {
    throw new Error(
      json.errors.map((error) => error.message ?? "unknown error").join("; "),
    );
  }

  return json.data?.cvstrategy?.archived === true;
}

test("should archive the e2e pool", async ({
  context,
  page,
  metamaskPage,
  extensionId,
}) => {
  const { chainId, communityId } = getConfig();
  const strategy = await fetchLatestEnabledUnarchivedStrategy();
  if (!strategy) {
    throw new Error("No enabled unarchived pool found to archive");
  }

  const metamask = new MetaMask(
    context,
    metamaskPage,
    basicSetup.walletPassword,
    extensionId,
  );

  await page.goto(`/gardens/${chainId}/${communityId}/${strategy.poolId}`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  await page.bringToFront();
  await connectWallet(page, metamask);

  const archiveButton = page.getByTestId("btn-archive");
  await expect(archiveButton).toBeVisible({ timeout: 120000 });
  await expect(archiveButton).toBeEnabled({ timeout: 120000 });
  await archiveButton.click();
  await confirmTransaction({ metamask, extensionId });
  await page.bringToFront();
  await expectNoErrorToast(page);

  await expect
    .poll(() => fetchStrategyArchived(strategy.id), {
      timeout: 180000,
      intervals: [1000, 2000, 3000, 5000],
      message: `strategy ${strategy.id} archived`,
    })
    .toBe(true);
});
