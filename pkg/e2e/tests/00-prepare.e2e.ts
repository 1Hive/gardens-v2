import { testWithSynpress } from "@synthetixio/synpress";
import basicSetup from "../wallet-setup/basic.setup";
import {
  metaMaskFixtures,
  archivePools,
  leaveCommunityIfMember,
} from "./utils";

const test = testWithSynpress(metaMaskFixtures(basicSetup));

test.setTimeout(600000);

test("should ensure wallet is not a member before running e2e flow", async () => {
  await archivePools();
  await leaveCommunityIfMember();
});
