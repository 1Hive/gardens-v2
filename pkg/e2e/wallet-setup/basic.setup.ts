import "dotenv/config";
// Import necessary Synpress modules
import { defineWalletSetup } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";

// Define a test seed phrase and password
const SEED_PHRASE = process.env.E2E_WALLET_SEED_PHRASE;
const PASSWORD = "Tester@1234";

// Define the basic wallet setup
export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
  if (!SEED_PHRASE) {
    throw new Error("E2E_WALLET_SEED_PHRASE environment variable is not set");
  }
  // Create a new MetaMask instance
  const metamask = new MetaMask(context, walletPage, PASSWORD);

  // Import the wallet using the seed phrase
  await metamask.importWallet(SEED_PHRASE);

  // Add and switch to Optimism so all tests start on the correct network
  await metamask.addNetwork({
    name: "OP Mainnet",
    rpcUrl: "https://mainnet.optimism.io",
    chainId: 10,
    symbol: "ETH",
    blockExplorerUrl: "https://optimistic.etherscan.io"
  });
  await metamask.switchNetwork("OP Mainnet");
});
