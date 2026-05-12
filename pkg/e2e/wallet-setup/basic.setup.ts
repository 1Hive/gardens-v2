import "dotenv/config";
import { defineWalletSetup } from "@synthetixio/synpress";
import { runBasicWalletSetup } from "./basic.setup.helpers";

const PASSWORD = "Tester@1234";

// NOTE FOR AGENTS:
// Keep this callback minimal and delegate logic to `basic.setup.helpers.ts`.
// Synpress parses this file with a fragile regex during cache build; inlining
// complex logic here can make `build-cache:force` hang before launching Chrome.
// Also treat `@synthetixio/synpress` version changes in `pkg/e2e/package.json`
// as MetaMask version changes; verify wallet setup after any bump/downgrade.
export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
  await runBasicWalletSetup(context, walletPage, PASSWORD);
});
