import path from "path";
import fs from "fs";
let runLatest = fs
  .readFileSync(
    path.join(
      "../../broadcast/DeployCVArbSepolia.s.sol/421614",
      "run-latest.json",
    ),
  )
  .toString();

runLatest = JSON.parse(runLatest);

if (runLatest) {
  const txs = runLatest.transactions;
  let registryCommunity;
  let factory;
  for (const tx of txs) {
    if (tx.contractName == "RegistryCommunity") {
      registryCommunity = tx.contractAddress;
    } else if (tx.contractName == "RegistryFactory") {
      factory = tx.contractAddress;
    }
  }

  console.log("factory", factory);
  console.log("registryCommunity", registryCommunity);
}
