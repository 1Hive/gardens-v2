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

  // Additional setup steps can be added here, such as:
  // - Adding custom networks
  // - Importing tokens
  // - Setting up specific account states
});
