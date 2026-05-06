import { testWithSynpress } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";
import basicSetup from "../wallet-setup/basic.setup";
import {
  approveTokenAllowance,
  confirmTransaction,
  connectWallet,
  expectNoErrorToast,
  getByTestId,
  gotoE2ECommunity,
  metaMaskFixtures,
  getConfig
} from "./utils";
const test = testWithSynpress(metaMaskFixtures(basicSetup));

const { expect } = test;

// Give the flow extra breathing room; MetaMask + subgraph responses can be slow
test.setTimeout(240000);

// Define a basic test case
test("should create a pool in the community", async ({
  context,
  page,
  metamaskPage,
  extensionId
}) => {
  // Create a new MetaMask instance
  const metamask = new MetaMask(
    context,
    metamaskPage,
    basicSetup.walletPassword,
    extensionId
  );

  await page.bringToFront();
  await connectWallet(page, metamask);
  await gotoE2ECommunity(page);

  await page.waitForTimeout(2000); // Wait for tx to succeed and UI to update

  // Stake Create Pool
  await getByTestId(page, "btn-create-pool").click();

  // Select funding pool type
  await getByTestId(page, "pool-type-option-1").click();

  //Find all inputs
  const nameInput = getByTestId(page, "input-pool-name");
  await expect(nameInput).toBeVisible({ timeout: 30000 });
  const descriptionInput = getByTestId(page, "input-pool-description").locator(
    '[contenteditable="true"]'
  );
  const tokenAddressInput = getByTestId(page, "input-token-address");
  const proposalCollateralInput = getByTestId(
    page,
    "input-collateral-create-proposal"
  );
  const disputeCollateralInput = getByTestId(page, "input-dispute-proposal");

  // Fill all inputs
  await nameInput.fill("Test Pool");
  await descriptionInput.fill("Test Description");
  const { governanceToken } = getConfig();
  await tokenAddressInput.fill(governanceToken);
  await proposalCollateralInput.fill("0.0000000001");
  await disputeCollateralInput.fill("0.0000000001");
  await getByTestId(page, "btn-preview-pool").click();
  await getByTestId(page, "btn-submit-pool").click();

  // Approve token allowance for staking
  await approveTokenAllowance({ page, metamask, extensionId });
  await page.waitForTimeout(1000); // Wait for next tx to launch

  // Confirm the stake transaction
  await confirmTransaction({ metamask, extensionId });
  await expectNoErrorToast(page);
});
