// import path from "path";
// import fs from "fs";
// let runLatest = fs
//   .readFileSync(
//     path.join(
//       "../../broadcast/DeployCVArbSepolia.s.sol/421614",
//       "run-latest.json",
//     ),
//   )
//   .toString();

// runLatest = JSON.parse(runLatest);
import { fromHex } from "viem";

import runLatest from "../../../../broadcast/DeployCVArbSepolia.s.sol/421614/run-latest.json" assert { type: "json" };

// console.log(runLatest);
// return;
if (runLatest) {
  const txs = runLatest.transactions;
  const receipts = runLatest.receipts;

  for (const receipt of receipts) {
    type Log = (typeof receipt.logs)[0];
    const logWithTopic = receipt.logs.find((log: Log) =>
      log.topics.find(
        (topic) =>
          topic ==
          "0x69bcb5a6cf6a3c95185cbb451e77787240c866dd2e8332597e3013ff18a1aba1",
      ),
    );
    if (logWithTopic) {
      // console.log("txHash", logWithTopic.transactionHash);
      const txForIt = runLatest.transactions.find(
        (tx) => tx.hash == logWithTopic.transactionHash,
      );
      console.log("strategyAddr", txForIt?.arguments?.[1]);
      // console.log("topic", logWithTopic.topics[0]);
      console.log(
        "poolID",
        fromHex(logWithTopic.topics[1] as `0x${string}`, "number"),
      );
    }
  }
  let registryCommunity;
  let factory;
  for (const tx of txs) {
    if (tx.contractName == "RegistryCommunity") {
      registryCommunity = tx.contractAddress;
    } else if (tx.contractName == "RegistryFactory") {
      factory = tx.contractAddress;
    } else if (tx.contractName == "SafeProxy") {
      // safe = tx.contractAddress;
      console.log("safe", tx.contractAddress);
    }
  }

  console.log("factory", factory);
  console.log("registryCommunity", registryCommunity);
}
