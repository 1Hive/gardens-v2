import { testWithSynpress } from "@synthetixio/synpress";
import basicSetup from "../wallet-setup/basic.setup";
import { leaveCommunityIfMember, metaMaskFixtures } from "./utils";

const test = testWithSynpress(metaMaskFixtures(basicSetup));

test.setTimeout(240000);

test("should leave community", async () => {
  await leaveCommunityIfMember();
});
