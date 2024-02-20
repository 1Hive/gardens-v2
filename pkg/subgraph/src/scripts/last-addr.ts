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

// import runLatest from "../../../../broadcast/DeployCVArbSepolia.s.sol/421614/run-latest.json" assert { type: "json" };
import runLatest from "../../../../broadcast/DeployCV.s.sol/1337/run-latest.json" assert { type: "json" };

export type RunLatest = typeof runLatest;
export type Address = `0x${string}`;
// export type AddressOrUndefined = Address | undefined;
// console.log(runLatest);
// return;

export function extractAddr(runLatest?: RunLatest) {
  let registryCommunity: Address = "0x";
  let factory: Address = "0x";
  let token: Address = "0xcc6c8B9f745dB2277f7aaC1Bc026d5C2Ea7bD88D";
  let safe: Address = "0x";
  if (runLatest) {
    const txs = runLatest.transactions;
    const receipts = runLatest.receipts;

    for (const receipt of receipts) {
      type Log = (typeof receipt.logs)[0];
      const logWithTopic = receipt.logs.find((log: Log) =>
        log.topics.find(
          (topic) =>
            topic ==
            "0x69bcb5a6cf6a3c95185cbb451e77787240c866dd2e8332597e3013ff18a1aba1", //CreatedPool event
        ),
      );
      if (logWithTopic) {
        // console.log("txHash", logWithTopic.transactionHash);
        const txForIt = runLatest.transactions.find(
          (tx) => tx.hash == logWithTopic.transactionHash,
        );
        const strategyAddr = txForIt?.arguments?.[1];
        // console.log("strategyAddr", strategyAddr);
        // console.log("topic", logWithTopic.topics[0]);
        // console.log(
        //   "poolID",
        //   fromHex(logWithTopic.topics[1] as `0x${string}`, "number"),
        // );
      }
    }
    for (const tx of txs) {
      if (tx.contractName == "RegistryCommunity") {
        registryCommunity = tx.contractAddress as Address;
      } else if (
        tx.contractName ==
        "pkg/contracts/src/RegistryCommunity.sol:RegistryCommunity"
      ) {
        registryCommunity = tx.contractAddress as Address;
      } else if (tx.contractName == "RegistryFactory") {
        factory = tx.contractAddress as Address;
      } else if (tx.contractName == "SafeProxy") {
        safe = tx.contractAddress as Address;
      } else if (
        tx.contractName == "lib/allo-v2/test/utils/MockERC20.sol:MockERC20"
      ) {
        token = tx.contractAddress as Address;
      }
    }

    // console.log("token", token);
    // console.log("safe", safe);
    // console.log("factory", factory);
    // console.log("registryCommunity", registryCommunity);
  }
  return {
    token,
    safe,
    factory,
    registryCommunity,
  };
}

const data = extractAddr(runLatest);
console.log(data);
