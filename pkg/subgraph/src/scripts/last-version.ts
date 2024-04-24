#! /usr/bin/env node

import { Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import fs from "fs";
import { spawn } from "child_process";

const queryLogin = `mutation Login($ethAddress: String!, $message: String!, $signature: String!, $multisigOwnerAddress: String, $networkId: Int) {
  login(
    ethAddress: $ethAddress
    message: $message
    signature: $signature
    multisigOwnerAddress: $multisigOwnerAddress
    networkId: $networkId
  ) {
    ...AuthUserFragment
    __typename
  }
}

fragment AuthUserFragment on User {
  id
  ethAddress
  emailAddress
  deployKey
  firstLogin
  subsidizedQueriesRemaining
  queryStatus
  totalUnpaidInvoiceAmount
  subgraphsCount
  stripePaymentMethod {
    id
    brand
    last4
    expMonth
    expYear
    __typename
  }
  stripeCharges {
    id
    amount
    receiptUrl
    date
    status
    __typename
  }
  ongoingInvoice {
    totalQueryFees
    billingPeriodStartsAt
    billingPeriodEndsAt
    __typename
  }
  __typename
}`;

const querySubgraphWithAuthuserSubgraphs = `query SubgraphWithAuthUserSubgraphs($name: String) {
  subgraph(name: $name) {
    id
    userId
    name
    displayName
    description
    sourceCodeUrl
    imageUrl
    websiteUrl
    publishedSubgraphs {
      id
      networkChainUID
      networkSubgraphId
      createdAt
      updatedAt
      __typename
    }
    createdAt
    updatedAt
    categories
    isHosted
    latestVersionQueryURL
    versions {
      id
      label
      subgraphId
      deploymentId
      queryUrl
      network
      latestEthereumBlockNumber
      totalEthereumBlocksCount
      entityCount
      failed
      synced
      createdAt
      updatedAt
      archiveType
      publishStatus
      indexedNetworkChainUID
      publishedNetworks {
        id
        networkChainUID
        publishStatus
        createdAt
        updatedAt
        txHash
        safeTxHash
        __typename
      }
      exampleQuery
      savedQueries {
        id
        name
        query
        isDefault
        versionId
        __typename
      }
      __typename
    }
    __typename
  }
  authUserSubgraphs {
    id
    name
    displayName
    status
    imageUrl
    __typename
  }
}`;

// check if cookies are saved
let setCookies: string[] | undefined;

try {
  setCookies = JSON.parse(fs.readFileSync("cookies.json").toString());
} catch (e) {
  const { ethAddress, message, signature } = await signMessage();

  console.log("cookies not found");
  const { ok, setCookies: cookie } = await subgraphFetch({
    query: queryLogin,
    operationName: "Login",
    variables: {
      ethAddress,
      message,
      signature,
    },
  });
  if (!ok) {
    throw new Error("Login failed");
  }
  if (!cookie) {
    throw new Error("No cookies found");
  }
  setCookies = cookie;
  fs.writeFileSync("cookies.json", JSON.stringify(setCookies, null, 2));
}

const args = process.argv.slice(2);

if (args.length === 0) {
  throw new Error("Please provide subgraph name");
}

const name = args[0];

console.log("args", args);
// save cookies in file for future use

const { ok: ok2, json } = await subgraphFetch({
  query: querySubgraphWithAuthuserSubgraphs,
  operationName: "SubgraphWithAuthUserSubgraphs",
  variables: {
    name,
  },
  cookies: setCookies,
});

if (!ok2) {
  console.error(JSON.stringify(json, null, 2));
  throw new Error("Subgraph fetch failed");
}

const subgraph = json.data.subgraph;

if (!subgraph) {
  throw new Error("Subgraph not found");
}
const versions: Array<{ id: number; label: string }> = subgraph.versions;
versions.sort((a, b) => b.id - a.id);

console.log("latest version", versions[0].id);
const label = versions[0].label;
console.log("latest version label", label);

if (label === undefined || label.trim() === "") {
  throw new Error("No label found");
}

// "v0.1.16" regexp to upgrade semver
const match = label.match(/v(\d+)\.(\d+)\.(\d+)/);
if (!match) {
  throw new Error("No match found");
}

const major = parseInt(match[1]);
const minor = parseInt(match[2]);
const patch = parseInt(match[3]);

const newPatch = patch + 1;

const newLabel = `v${major}.${minor}.${newPatch}`; //@todo: should increase minor and major

console.log("new label", newLabel);

const graphDeploySpawn = spawn("pnpm", [
  //@todo: using pnpm, could be a argument
  "graph",
  "deploy",
  "--studio",
  name,
  "-l",
  newLabel,
]);

graphDeploySpawn.stdout.on("data", (data) => {
  console.log(`${data}`);
});

graphDeploySpawn.stderr.on("data", (data) => {
  console.error(`${data}`);
});

graphDeploySpawn.on("close", (code) => {
  console.log(`child process exited with code ${code}`);
});

async function subgraphFetch({
  query,
  operationName,
  variables,
  cookies,
}: {
  query: string;
  operationName: string;
  variables?: any;
  cookies?: string[];
}) {
  const body = {
    operationName,
    variables,
    query: query,
  };

  // console.log(JSON.stringify(body, null, 2));

  const res = await fetch("https://api.studio.thegraph.com/graphql", {
    headers: {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      pragma: "no-cache",
      "sec-ch-ua": '"Not A(Brand";v="99", "Brave";v="121", "Chromium";v="121"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Linux"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "sec-gpc": "1",
      Referer: "https://thegraph.com/",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      cookie: cookies ? cookies.join("; ") : "",
    },
    body: JSON.stringify(body),

    method: "POST",
  });

  // take cookies and setup to next fetch
  const setCookies = res.headers.getSetCookie();
  // console.log("cookies", cookies);

  const json = await res.json();
  // console.log(JSON.stringify(json, null, 2));

  return { ok: res.ok, setCookies, json };
}

async function signMessage() {
  const pk = process.env.PK as Address;

  if (!pk) {
    throw new Error("PK env not found");
  }

  const account = privateKeyToAccount(pk);

  const timestamp = Date.now();

  const message = `Sign this message to prove you have access to this wallet in order to sign in to thegraph.com/studio.\r\n\r\nThis won't cost you any Ether.\r\n\r\nTimestamp: ${timestamp}`;

  const ethAddress = account.address;

  const signature = await account.signMessage({ message });

  return { ethAddress, message, signature };
}
