import { execFileSync } from "node:child_process";
import { createPublicClient, createWalletClient, defineChain, formatUnits, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const NETWORKS = {
  arbitrum: {
    chainId: 42161,
    rpcUrl: process.env.RPC_URL_ARB || "https://arb1.arbitrum.io/rpc",
    nativeSymbol: "ETH",
    nativeName: "Ether",
    lifiNativeTokenAddress: ZERO_ADDRESS,
    acrossSupported: true,
  },
  optimism: {
    chainId: 10,
    rpcUrl: process.env.RPC_URL_OPT || "https://mainnet.optimism.io",
    nativeSymbol: "ETH",
    nativeName: "Ether",
    lifiNativeTokenAddress: ZERO_ADDRESS,
    acrossSupported: true,
  },
  ethereum: {
    chainId: 1,
    rpcUrl: process.env.RPC_URL_ETHEREUM || "https://ethereum-rpc.publicnode.com",
    nativeSymbol: "ETH",
    nativeName: "Ether",
    lifiNativeTokenAddress: ZERO_ADDRESS,
    acrossSupported: true,
  },
  mainnet: {
    chainId: 1,
    rpcUrl: process.env.RPC_URL_ETHEREUM || "https://ethereum-rpc.publicnode.com",
    nativeSymbol: "ETH",
    nativeName: "Ether",
    lifiNativeTokenAddress: ZERO_ADDRESS,
    acrossSupported: true,
  },
  base: {
    chainId: 8453,
    rpcUrl: process.env.RPC_URL_BASE || "https://mainnet.base.org",
    nativeSymbol: "ETH",
    nativeName: "Ether",
    lifiNativeTokenAddress: ZERO_ADDRESS,
    acrossSupported: true,
  },
  polygon: {
    chainId: 137,
    rpcUrl: process.env.RPC_URL_POLYGON || "https://polygon-rpc.com",
    nativeSymbol: "POL",
    nativeName: "Polygon Ecosystem Token",
    lifiNativeTokenAddress: ZERO_ADDRESS,
    acrossSupported: true,
  },
  gnosis: {
    chainId: 100,
    rpcUrl: process.env.RPC_URL_GNOSIS || "https://rpc.gnosischain.com",
    nativeSymbol: "xDAI",
    nativeName: "xDAI",
    lifiNativeTokenAddress: ZERO_ADDRESS,
    acrossSupported: false,
  },
  xdai: {
    chainId: 100,
    rpcUrl: process.env.RPC_URL_GNOSIS || "https://rpc.gnosischain.com",
    nativeSymbol: "xDAI",
    nativeName: "xDAI",
    lifiNativeTokenAddress: ZERO_ADDRESS,
    acrossSupported: false,
  },
  celo: {
    chainId: 42220,
    rpcUrl: process.env.RPC_URL_CELO || "https://forno.celo.org",
    nativeSymbol: "CELO",
    nativeName: "CELO",
    lifiNativeTokenAddress: "0x471EcE3750Da237f93B8E339c536989b8978a438",
    acrossSupported: false,
  },
};
const ACROSS_URL = "https://app.across.to/api";
const LIFI_URL = "https://li.quest/v1";

function fail(message) {
  console.error(`[bridge-gas] ${message}`);
  process.exit(1);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) fail(`missing ${name}`);
  return value;
}

function getMode() {
  return process.env.BRIDGE_MODE === "execute" ? "execute" : "quote";
}

function getNetwork(name, envName) {
  const key = (name || "").toLowerCase();
  const network = NETWORKS[key];
  if (!network) {
    fail(`unsupported ${envName}=${name}. Supported: ${Object.keys(NETWORKS).join(" ")}`);
  }
  if (!network.rpcUrl) {
    fail(`missing RPC env for ${envName}=${name}`);
  }
  return { key, ...network };
}

function getPrivateKey() {
  const key =
    process.env.BRIDGE_PRIVATE_KEY ??
    process.env.STREAMING_REBALANCER_PK ??
    process.env.KEEPER_WALLET_PK;
  if (!key) fail("missing BRIDGE_PRIVATE_KEY / STREAMING_REBALANCER_PK / KEEPER_WALLET_PK");
  return key.startsWith("0x") ? key : `0x${key}`;
}

function getAddressFromEnv() {
  const address = process.env.BRIDGE_ADDRESS;
  return address && address.length > 0 ? address : null;
}

function runCast(args, env = {}) {
  return execFileSync("cast", args, {
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
    },
  }).trim();
}

function extractPrivateKey(output) {
  const match = output.match(/0x[a-fA-F0-9]{64}/);
  if (!match) {
    fail("could not parse private key from cast wallet decrypt-keystore output");
  }
  return match[0];
}

function resolveSigner(mode) {
  const explicitAddress = getAddressFromEnv();
  const accountName = process.env.BRIDGE_FROM_ACCOUNT;
  const accountPassword =
    process.env.BRIDGE_FROM_PASSWORD ??
    process.env.PK_DEPLOYER_PW ??
    null;

  if (accountName) {
    if (!accountPassword) {
      fail(`missing password for BRIDGE_FROM_ACCOUNT=${accountName}`);
    }

    const address = runCast(
      ["wallet", "address", "--account", accountName, "--password", accountPassword],
    );

    if (mode !== "execute") {
      return {
        address,
        privateKey: null,
        accountName,
      };
    }

    const privateKey = runCast(
      ["wallet", "decrypt-keystore", accountName, "--unsafe-password", accountPassword],
    );

    return {
      address,
      privateKey: extractPrivateKey(privateKey),
      accountName,
    };
  }

  if (explicitAddress) {
    return {
      address: explicitAddress,
      privateKey: null,
      accountName: null,
    };
  }

  const privateKey = getPrivateKey();
  return {
    address: privateKeyToAccount(privateKey).address,
    privateKey,
    accountName: null,
  };
}

async function fetchJson(url, options = {}) {
  const headers = {
    accept: "application/json",
    ...(process.env.LIFI_API_KEY ? { "x-lifi-api-key": process.env.LIFI_API_KEY } : {}),
    ...(options.headers || {}),
  };
  if (options.body != null) {
    headers["content-type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 800)}`);
  }

  return response.json();
}

function buildChain(network) {
  return defineChain({
    id: network.chainId,
    name: network.key,
    nativeCurrency: {
      name: network.nativeName,
      symbol: network.nativeSymbol,
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [network.rpcUrl],
      },
    },
  });
}

function formatNative(amountWei, network) {
  return `${formatUnits(amountWei, 18)} ${network.nativeSymbol}`;
}

function sumFeeUsd(feeCosts) {
  return (feeCosts || []).reduce((sum, fee) => {
    const amount = Number(fee.amountUSD || 0);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);
}

async function fetchLifiChains() {
  const data = await fetchJson(`${LIFI_URL}/chains`);
  return data.chains ?? data;
}

async function resolveSourceAmountWei({ fromNetwork, sourceUsd, fromAmount }) {
  if (fromAmount) {
    return parseUnits(fromAmount, 18);
  }

  if (!sourceUsd) {
    return null;
  }

  const chains = await fetchLifiChains();
  const chain = chains.find((entry) => Number(entry.id) === Number(fromNetwork.chainId));
  const priceUsd = Number(chain?.nativeToken?.priceUSD);
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
    throw new Error(`could not resolve native USD price for source chain ${fromNetwork.key}`);
  }

  const nativeAmount = Number(sourceUsd) / priceUsd;
  return parseUnits(nativeAmount.toFixed(18), 18);
}

async function quoteAcross({ fromNetwork, toNetwork, address, recipient, toAmountWei, fromAmountWei }) {
  if (!fromNetwork.acrossSupported || !toNetwork.acrossSupported) return null;

  const params = new URLSearchParams({
    tradeType: fromAmountWei != null ? "exactInput" : "exactOutput",
    amount: (fromAmountWei ?? toAmountWei).toString(),
    inputToken: ZERO_ADDRESS,
    outputToken: ZERO_ADDRESS,
    originChainId: String(fromNetwork.chainId),
    destinationChainId: String(toNetwork.chainId),
    depositor: address,
    recipient,
  });

  const quote = await fetchJson(`${ACROSS_URL}/swap/approval?${params}`);
  if (!quote.swapTx?.simulationSuccess) {
    throw new Error("Across simulation failed");
  }

  return {
    provider: "across",
    upstreamTool: "across",
    inputAmountWei: BigInt(quote.inputAmount),
    outputAmountWei: BigInt(quote.expectedOutputAmount ?? quote.minOutputAmount ?? quote.expectedOutputAmount),
    targetOutputWei: toAmountWei ?? BigInt(quote.expectedOutputAmount ?? quote.minOutputAmount),
    amountMode: fromAmountWei != null ? "exactInput" : "exactOutput",
    feeUsd: Number(quote.fees?.total?.amountUsd || 0),
    expectedFillTimeSec: Number(quote.expectedFillTime || 0),
    tx: {
      to: quote.swapTx.to,
      data: quote.swapTx.data,
      value: BigInt(quote.swapTx.value || "0"),
      gas: quote.swapTx.gas ? BigInt(quote.swapTx.gas) : undefined,
      maxFeePerGas: quote.swapTx.maxFeePerGas ? BigInt(quote.swapTx.maxFeePerGas) : undefined,
      maxPriorityFeePerGas: quote.swapTx.maxPriorityFeePerGas
        ? BigInt(quote.swapTx.maxPriorityFeePerGas)
        : undefined,
    },
    raw: quote,
  };
}

async function quoteLifi({ fromNetwork, toNetwork, address, recipient, toAmountWei, fromAmountWei, slippage }) {
  const params = new URLSearchParams({
    fromChain: String(fromNetwork.chainId),
    toChain: String(toNetwork.chainId),
    fromToken: fromNetwork.lifiNativeTokenAddress,
    toToken: toNetwork.lifiNativeTokenAddress,
    ...(fromAmountWei != null
      ? { fromAmount: fromAmountWei.toString() }
      : { toAmount: toAmountWei.toString() }),
    fromAddress: address,
    toAddress: recipient,
    order: "CHEAPEST",
    slippage: String(slippage),
  });

  const endpoint = fromAmountWei != null ? "quote" : "quote/toAmount";
  const quote = await fetchJson(`${LIFI_URL}/${endpoint}?${params}`);
  const tx = quote.transactionRequest;
  if (!tx?.to || !tx?.data) {
    throw new Error("LI.FI quote missing transactionRequest");
  }

  return {
    provider: "lifi",
    upstreamTool: quote.toolDetails?.key ?? quote.tool ?? "unknown",
    inputAmountWei: BigInt(quote.estimate.fromAmount),
    outputAmountWei: BigInt(quote.estimate.toAmount ?? quote.estimate.toAmountMin),
    targetOutputWei: toAmountWei ?? BigInt(quote.estimate.toAmount ?? quote.estimate.toAmountMin),
    amountMode: fromAmountWei != null ? "exactInput" : "exactOutput",
    feeUsd: sumFeeUsd(quote.estimate.feeCosts),
    expectedFillTimeSec: Number(quote.estimate.executionDuration || 0),
    tx: {
      to: tx.to,
      data: tx.data,
      value: BigInt(tx.value || "0"),
      gas: tx.gasLimit ? BigInt(tx.gasLimit) : undefined,
      gasPrice: tx.gasPrice ? BigInt(tx.gasPrice) : undefined,
    },
    raw: quote,
  };
}

function chooseBestQuote(quotes) {
  return [...quotes].sort((a, b) => {
    if (a.inputAmountWei < b.inputAmountWei) return -1;
    if (a.inputAmountWei > b.inputAmountWei) return 1;
    if (a.provider === "across" && b.provider !== "across") return -1;
    if (b.provider === "across" && a.provider !== "across") return 1;
    return 0;
  })[0];
}

function printQuote(label, quote, fromNetwork, toNetwork) {
  console.log(`[bridge-gas] ${label}`);
  console.log(`  provider: ${quote.provider}${quote.upstreamTool ? ` (${quote.upstreamTool})` : ""}`);
  console.log(`  route: ${fromNetwork.key} -> ${toNetwork.key}`);
  console.log(`  amount mode: ${quote.amountMode}`);
  console.log(`  input required: ${formatNative(quote.inputAmountWei, fromNetwork)}`);
  console.log(`  target output: ${formatNative(quote.targetOutputWei, toNetwork)}`);
  console.log(`  estimated output: ${formatNative(quote.outputAmountWei, toNetwork)}`);
  console.log(`  estimated fee usd: ${quote.feeUsd.toFixed(6)}`);
  if (quote.expectedFillTimeSec > 0) {
    console.log(`  expected fill time: ${quote.expectedFillTimeSec}s`);
  }
}

async function executeQuote({ quote, network, privateKey }) {
  const account = privateKeyToAccount(privateKey);
  const chain = buildChain(network);
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(network.rpcUrl),
  });
  const publicClient = createPublicClient({
    chain,
    transport: http(network.rpcUrl),
  });

  const txRequest = {
    account,
    chain,
    to: quote.tx.to,
    data: quote.tx.data,
    value: quote.tx.value,
    gas: quote.tx.gas,
  };

  if (quote.tx.gasPrice != null) {
    txRequest.gasPrice = quote.tx.gasPrice;
  }
  if (quote.tx.maxFeePerGas != null) {
    txRequest.maxFeePerGas = quote.tx.maxFeePerGas;
  }
  if (quote.tx.maxPriorityFeePerGas != null) {
    txRequest.maxPriorityFeePerGas = quote.tx.maxPriorityFeePerGas;
  }

  const hash = await walletClient.sendTransaction(txRequest);
  console.log(`[bridge-gas] submitted ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`[bridge-gas] confirmed in block ${receipt.blockNumber}`);
}

async function main() {
  const mode = getMode();
  const fromNetwork = getNetwork(requireEnv("SOURCE_NETWORK"), "SOURCE_NETWORK");
  const toNetwork = getNetwork(requireEnv("DESTINATION_NETWORK"), "DESTINATION_NETWORK");
  if (fromNetwork.chainId === toNetwork.chainId) {
    fail("SOURCE_NETWORK and DESTINATION_NETWORK must differ");
  }

  const signer = resolveSigner(mode);
  const recipient = process.env.RECIPIENT_ADDRESS || signer.address;
  const toAmount = process.env.TO_AMOUNT || null;
  const fromAmount = process.env.FROM_AMOUNT || null;
  const sourceUsd = process.env.SOURCE_USD || null;
  const configuredModes = [toAmount != null, fromAmount != null || sourceUsd != null].filter(Boolean).length;
  if (configuredModes !== 1) {
    fail("set exactly one amount mode: TO_AMOUNT or FROM_AMOUNT/SOURCE_USD");
  }
  const toAmountWei = toAmount ? parseUnits(toAmount, 18) : null;
  const fromAmountWei = await resolveSourceAmountWei({
    fromNetwork,
    sourceUsd,
    fromAmount,
  });
  const slippage = Number(process.env.SLIPPAGE || "0.005");
  if (!Number.isFinite(slippage) || slippage < 0 || slippage > 1) {
    fail(`invalid SLIPPAGE=${process.env.SLIPPAGE}`);
  }

  const providers = (process.env.BRIDGE_PROVIDERS || "across,lifi")
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean);
  if (providers.length === 0) {
    fail("BRIDGE_PROVIDERS resolved to an empty list");
  }

  console.log(`[bridge-gas] mode=${mode} sender=${signer.address} recipient=${recipient}`);
  console.log(`[bridge-gas] native-only bridge quoting is enabled in this first pass`);
  if (sourceUsd) {
    console.log(`[bridge-gas] source usd budget: $${sourceUsd}`);
  }

  const quotes = [];
  const errors = [];

  for (const provider of providers) {
    try {
      if (provider === "across") {
        const quote = await quoteAcross({
          fromNetwork,
          toNetwork,
          toAmountWei,
          fromAmountWei,
          address: signer.address,
          recipient,
        });
        if (quote) quotes.push(quote);
        else console.log(`[bridge-gas] provider=across unsupported for ${fromNetwork.key} -> ${toNetwork.key}`);
        continue;
      }

      if (provider === "lifi") {
        quotes.push(
          await quoteLifi({
            fromNetwork,
            toNetwork,
            toAmountWei,
            fromAmountWei,
            address: signer.address,
            recipient,
            slippage,
          }),
        );
        continue;
      }

      console.log(`[bridge-gas] skipping unknown provider=${provider}`);
    } catch (error) {
      errors.push(`${provider}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (quotes.length === 0) {
    fail(`no quotes available. Errors: ${errors.join(" | ") || "none"}`);
  }

  for (const quote of quotes) {
    printQuote("candidate", quote, fromNetwork, toNetwork);
  }

  const selected = chooseBestQuote(quotes);
  printQuote("selected", selected, fromNetwork, toNetwork);

  if (errors.length > 0) {
    console.log(`[bridge-gas] non-fatal provider errors: ${errors.join(" | ")}`);
  }

  if (mode !== "execute") return;
  if (!signer.privateKey) {
    fail("execute mode requires a decryptable sender key via BRIDGE_FROM_ACCOUNT or BRIDGE_PRIVATE_KEY");
  }
  if (process.env.CONFIRM_BRIDGE_EXECUTION !== "true") {
    fail("set CONFIRM_BRIDGE_EXECUTION=true to send the selected bridge transaction");
  }

  await executeQuote({
    quote: selected,
    network: fromNetwork,
    privateKey: signer.privateKey,
  });
}

main().catch((error) => {
  fail(error instanceof Error ? error.stack || error.message : String(error));
});
