"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { AbiFunction, AbiParameter } from "abitype";
import {
  Address,
  decodeFunctionResult,
  encodeFunctionData,
  isAddress,
  keccak256,
  parseAbiItem,
  stringToHex,
} from "viem";
import {
  useAccount,
  useContractRead,
  useNetwork,
  usePublicClient,
  useSwitchNetwork,
  useWalletClient,
} from "wagmi";
import { Button } from "@/components/Button";
import { InfoBox } from "@/components/InfoBox";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { CHAINS } from "@/configs/chains";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";
import { cvStrategyABI, registryCommunityABI } from "@/src/generated";
import { shortenAddress } from "@/utils/text";

type DiamondFacet = {
  facetAddress: Address;
  functionSelectors: string[];
};

type SignatureMap = Record<string, string[]>;
const EMPTY_FACETS: DiamondFacet[] = [];
type AggregatedAbiEntry =
  | (typeof registryCommunityABI)[number]
  | (typeof cvStrategyABI)[number];

const FACETS_ABI = [
  {
    inputs: [],
    name: "facets",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "facetAddress",
            type: "address",
          },
          {
            internalType: "bytes4[]",
            name: "functionSelectors",
            type: "bytes4[]",
          },
        ],
        internalType: "struct IDiamondLoupe.Facet[]",
        name: "facets_",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const SELECTOR_REGEX = /^0x[a-fA-F0-9]{8}$/;
const DECIMAL_REGEX = /^-?\d+$/;

const stringifyResult = (value: unknown) => {
  if (value === undefined) {
    return "No return value (0x)";
  }
  try {
    return JSON.stringify(
      value,
      (_, item) => (typeof item === "bigint" ? item.toString() : item),
      2,
    );
  } catch {
    return String(value);
  }
};

const parseFunctionFromSignature = (signature: string) =>
  parseAbiItem(`function ${signature.trim()}`) as AbiFunction;

const toCanonicalSignature = (abiFunction: AbiFunction) =>
  `${abiFunction.name}(${(abiFunction.inputs ?? []).map((input) => input.type).join(",")})`;

const selectorFromSignature = (signature: string) =>
  keccak256(stringToHex(signature)).slice(0, 10).toLowerCase();

const getTypeWithoutArraySuffix = (type: string) => type.replace(/\[\]$/g, "");

const getArrayDepth = (type: string) => (type.match(/\[\]/g) ?? []).length;

const parseNumberish = (value: unknown) => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isInteger(value)) {
    return BigInt(value);
  }
  if (typeof value === "string" && DECIMAL_REGEX.test(value.trim())) {
    return BigInt(value.trim());
  }
  return value;
};

const parseBoolish = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return value;
};

const normalizeValueForParameter = (
  value: unknown,
  parameter: AbiParameter,
): unknown => {
  const arrayDepth = getArrayDepth(parameter.type);
  if (arrayDepth > 0) {
    if (!Array.isArray(value)) {
      return value;
    }
    const nestedParameter: AbiParameter = {
      ...parameter,
      type: `${getTypeWithoutArraySuffix(parameter.type)}`,
    };
    return value.map((entry: unknown) =>
      normalizeValueForParameter(entry, nestedParameter),
    );
  }

  if (parameter.type.startsWith("uint") || parameter.type.startsWith("int")) {
    return parseNumberish(value);
  }

  if (parameter.type === "bool") {
    return parseBoolish(value);
  }

  if (parameter.type === "tuple") {
    const components = (
      "components" in parameter && Array.isArray(parameter.components) ?
        parameter.components
      : []
    ) as AbiParameter[];
    if (Array.isArray(value)) {
      return components.map((component: AbiParameter, index: number) =>
        normalizeValueForParameter(value[index], component),
      );
    }
    if (value != null && typeof value === "object") {
      const source = value as Record<string, unknown>;
      return components.map((component: AbiParameter, index: number) => {
        const fromName =
          component.name && component.name in source ?
            source[component.name]
          : undefined;
        const fromIndex = source[String(index)];
        return normalizeValueForParameter(
          fromName !== undefined ? fromName : fromIndex,
          component,
        );
      });
    }
  }

  return value;
};

const normalizeArgsForInputs = (
  rawArgs: unknown[],
  inputs: readonly AbiParameter[],
) =>
  inputs.map((input: AbiParameter, index: number) =>
    normalizeValueForParameter(rawArgs[index], input),
  );

export default function DiamondAdminPage() {
  const [addressInput, setAddressInput] = useState("");
  const [diamondAddress, setDiamondAddress] = useState<Address>();
  const [selectedChainId, setSelectedChainId] = useState<number>(
    CHAINS[0]?.id ?? 42161,
  );
  const [signatureMap, setSignatureMap] = useState<SignatureMap>({});
  const [isResolvingSignatures, setIsResolvingSignatures] = useState(false);
  const [signatureResolveError, setSignatureResolveError] = useState<
    string | null
  >(null);
  const [selectedSelector, setSelectedSelector] = useState("");
  const [selectedSignature, setSelectedSignature] = useState("");
  const [argsInput, setArgsInput] = useState("[]");
  const [valueInput, setValueInput] = useState("0");
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [readOutput, setReadOutput] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isExecutingRead, setIsExecutingRead] = useState(false);
  const [isExecutingWrite, setIsExecutingWrite] = useState(false);
  const didApplyQueryParamsRef = useRef(false);
  const queryParams = useCollectQueryParams();

  const isAddressValid = Boolean(addressInput) && isAddress(addressInput);
  const publicClient = usePublicClient({ chainId: selectedChainId });
  const { data: walletClient } = useWalletClient({ chainId: selectedChainId });
  const { chain } = useNetwork();
  const { switchNetworkAsync, isLoading: isSwitchingNetwork } =
    useSwitchNetwork();
  const { isConnected } = useAccount();

  const {
    data: rawFacets,
    isFetching,
    isError,
    error,
    refetch,
  } = useContractRead({
    address: diamondAddress,
    abi: FACETS_ABI,
    functionName: "facets",
    enabled: Boolean(diamondAddress),
    chainId: selectedChainId,
  });

  const facets = useMemo(
    () => (rawFacets as DiamondFacet[] | undefined) ?? EMPTY_FACETS,
    [rawFacets],
  );
  const totalSelectors = useMemo(
    () =>
      facets.reduce(
        (count, facet) => count + (facet?.functionSelectors?.length ?? 0),
        0,
      ),
    [facets],
  );
  const allSelectors = useMemo(
    () =>
      Array.from(
        new Set(
          facets.flatMap((facet) =>
            facet.functionSelectors.filter((selector) =>
              SELECTOR_REGEX.test(selector),
            ),
          ),
        ),
      ).sort(),
    [facets],
  );

  const selectedChain = CHAINS.find((entry) => entry.id === selectedChainId);
  const knownAbiFunctions = useMemo(() => {
    const combined = [
      ...registryCommunityABI,
      ...cvStrategyABI,
    ] as AggregatedAbiEntry[];
    return combined
      .filter(
        (
          item,
        ): item is Extract<AggregatedAbiEntry, { type: "function" }> =>
          item.type === "function",
      )
      .map((item) => item as unknown as AbiFunction);
  }, []);

  const knownFunctionBySignature = useMemo(() => {
    const entries = knownAbiFunctions.map((fn) => [
      toCanonicalSignature(fn),
      fn,
    ] as const);
    return new Map(entries);
  }, []);

  const knownFunctionsBySelector = useMemo(() => {
    const map = new Map<string, AbiFunction[]>();
    knownAbiFunctions.forEach((fn) => {
      const selector = selectorFromSignature(toCanonicalSignature(fn));
      const list = map.get(selector) ?? [];
      map.set(selector, [...list, fn]);
    });
    return map;
  }, [knownAbiFunctions]);

  const selectedKnownFunction = useMemo(() => {
    if (!selectedSignature.trim() && !selectedSelector) return null;

    if (selectedSignature.trim()) {
      try {
        const parsed = parseFunctionFromSignature(selectedSignature);
        const signature = toCanonicalSignature(parsed);
        const directMatch = knownFunctionBySignature.get(signature);
        if (directMatch) return directMatch;
      } catch {
        // continue with selector fallback
      }
    }

    if (selectedSelector && SELECTOR_REGEX.test(selectedSelector)) {
      const bySelector =
        knownFunctionsBySelector.get(selectedSelector.toLowerCase()) ?? [];
      if (bySelector.length === 1) {
        return bySelector[0];
      }
      if (selectedSignature.trim()) {
        const trimmed = selectedSignature.trim();
        const matchedByName = bySelector.find(
          (fn) => `${fn.name}(` === `${trimmed.split("(")[0]}(`,
        );
        if (matchedByName) {
          return matchedByName;
        }
      }
    }

    return null;
  }, [
    knownFunctionBySignature,
    knownFunctionsBySelector,
    selectedSelector,
    selectedSignature,
  ]);

  const selectedFunctionKind = useMemo(() => {
    if (!selectedKnownFunction) return "unknown";
    const mutability = selectedKnownFunction.stateMutability;
    if (mutability === "view" || mutability === "pure") return "read";
    return "write";
  }, [selectedKnownFunction]);

  const resolvedSelectedSignature = useMemo(() => {
    if (selectedKnownFunction) {
      return toCanonicalSignature(selectedKnownFunction);
    }
    try {
      const parsed = parseFunctionFromSignature(selectedSignature);
      return toCanonicalSignature(parsed);
    } catch {
      return selectedSignature.trim();
    }
  }, [selectedKnownFunction, selectedSignature]);

  useEffect(() => {
    if (didApplyQueryParamsRef.current) return;

    const chainIdParam = queryParams.chainId ?? queryParams.chain;
    const addressParam = queryParams.address ?? queryParams.diamond;
    const selectorParam = queryParams.selector;
    const signatureParam = queryParams.signature;
    const argsParam = queryParams.args;
    const valueParam = queryParams.value;

    const hasParams =
      chainIdParam != null ||
      addressParam != null ||
      selectorParam != null ||
      signatureParam != null ||
      argsParam != null ||
      valueParam != null;

    if (!hasParams) return;

    if (chainIdParam != null) {
      const nextChainId = Number(chainIdParam);
      if (!Number.isNaN(nextChainId)) {
        setSelectedChainId(nextChainId);
      }
    }

    if (addressParam != null && isAddress(addressParam)) {
      setAddressInput(addressParam);
      setDiamondAddress(addressParam as Address);
    }

    if (selectorParam != null && SELECTOR_REGEX.test(selectorParam)) {
      setSelectedSelector(selectorParam.toLowerCase());
    }

    if (signatureParam != null && signatureParam.trim() !== "") {
      setSelectedSignature(signatureParam);
    }

    if (argsParam != null && argsParam.trim() !== "") {
      setArgsInput(argsParam);
    }

    if (valueParam != null && valueParam.trim() !== "") {
      setValueInput(valueParam);
    }

    didApplyQueryParamsRef.current = true;
  }, [queryParams]);

  useEffect(() => {
    if (!allSelectors.length) {
      setSignatureMap((prev) => (Object.keys(prev).length ? {} : prev));
      setSignatureResolveError(null);
      return;
    }

    let isActive = true;
    const resolveSignatures = async () => {
      setIsResolvingSignatures(true);
      setSignatureResolveError(null);
      try {
        const response = await fetch(
          `/api/signatures?selectors=${allSelectors.join(",")}`,
        );
        if (!response.ok) {
          throw new Error(`Resolver request failed (${response.status})`);
        }
        const payload = (await response.json()) as {
          selectors?: SignatureMap;
        };
        if (isActive) {
          setSignatureMap(payload.selectors ?? {});
        }
      } catch (resolveError) {
        if (isActive) {
          const message =
            resolveError instanceof Error ?
              resolveError.message
            : "Unknown resolver error";
          setSignatureResolveError(message);
        }
      } finally {
        if (isActive) {
          setIsResolvingSignatures(false);
        }
      }
    };

    void resolveSignatures();
    return () => {
      isActive = false;
    };
  }, [allSelectors]);

  useEffect(() => {
    if (!allSelectors.length) {
      setSelectedSelector("");
      setSelectedSignature("");
      return;
    }
    if (!selectedSelector || !allSelectors.includes(selectedSelector)) {
      setSelectedSelector(allSelectors[0]);
    }
  }, [allSelectors, selectedSelector]);

  useEffect(() => {
    if (!selectedSelector) {
      setSelectedSignature("");
      return;
    }
    const candidates = signatureMap[selectedSelector] ?? [];
    if (!candidates.length) {
      return;
    }
    if (!selectedSignature || !candidates.includes(selectedSignature)) {
      setSelectedSignature(candidates[0]);
    }
  }, [selectedSelector, selectedSignature, signatureMap]);

  const handleInspectClick = () => {
    if (!isAddressValid) return;
    const normalized = addressInput as Address;
    if (diamondAddress === normalized) {
      refetch?.();
      return;
    }
    setSignatureMap({});
    setSelectedSelector("");
    setSelectedSignature("");
    setExecutionError(null);
    setReadOutput(null);
    setTxHash(null);
    setDiamondAddress(normalized);
  };

  const executeFunction = async (mode: "read" | "write") => {
    if (!diamondAddress) {
      setExecutionError("Set a valid diamond address first.");
      return;
    }
    if (!selectedSignature.trim()) {
      setExecutionError("Select a signature or enter one manually.");
      return;
    }
    if (mode === "read") {
      setIsExecutingRead(true);
    } else {
      setIsExecutingWrite(true);
    }
    setExecutionError(null);
    setReadOutput(null);
    setTxHash(null);

    try {
      const parsedArgs = JSON.parse(argsInput || "[]");
      if (!Array.isArray(parsedArgs)) {
        throw new Error("Arguments must be a JSON array.");
      }

      const functionAbi =
        selectedKnownFunction ?? parseFunctionFromSignature(selectedSignature);
      const normalizedArgs = normalizeArgsForInputs(
        parsedArgs,
        functionAbi.inputs ?? [],
      );
      const abi = [functionAbi] as const;

      const data = encodeFunctionData({
        abi,
        functionName: functionAbi.name,
        args: normalizedArgs,
      });

      if (mode === "read") {
        const response = await publicClient.call({
          to: diamondAddress,
          data,
        });
        const rawResult = response.data ?? "0x";
        if ((functionAbi.outputs ?? []).length === 0) {
          setReadOutput(
            rawResult !== "0x" ? `Raw return data:\n${rawResult}` : "No return value (0x)",
          );
          return;
        }
        const decoded = decodeFunctionResult({
          abi,
          functionName: functionAbi.name,
          data: rawResult,
        });
        setReadOutput(stringifyResult(decoded));
        return;
      }

      if (!walletClient?.account) {
        throw new Error("Connect a wallet on the selected chain to write.");
      }
      if (selectedFunctionKind === "read") {
        throw new Error(
          "Detected read-only function. Use Call (eth_call), no transaction signature required.",
        );
      }

      if (chain?.id !== selectedChainId) {
        if (!switchNetworkAsync) {
          throw new Error(
            `Wrong network: wallet is on ${chain?.id ?? "unknown"}. Switch to ${selectedChainId} in your wallet first.`,
          );
        }
        await switchNetworkAsync(selectedChainId);
      }

      const sanitizedValue = valueInput.trim();
      const value =
        sanitizedValue && DECIMAL_REGEX.test(sanitizedValue) ?
          BigInt(sanitizedValue)
        : 0n;

      const hash = await walletClient.sendTransaction({
        account: walletClient.account,
        to: diamondAddress,
        data,
        value,
      });
      setTxHash(hash);
    } catch (runError) {
      const message =
        runError instanceof Error ? runError.message : "Unknown execution error";
      setExecutionError(message);
    } finally {
      setIsExecutingRead(false);
      setIsExecutingWrite(false);
    }
  };

  const txExplorerBase = selectedChain?.blockExplorers?.default?.url;

  return (
    <div className="space-y-8 px-4 py-8">
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary-content/80">
          Admin tools
        </p>
        <h1 className="text-2xl font-semibold text-neutral-content">
          Diamond facet diagnostics
        </h1>
        <p className="text-sm text-neutral-muted">
          Inspect any diamond contract to understand which facets are registered
          and how many selectors each facet exposes.
        </p>
      </section>

      <section className="space-y-4">
        <div className="grid gap-4 rounded-2xl border border-border-neutral bg-neutral/10 p-4 md:grid-cols-[1.5fr_1fr_160px]">
          <label className="flex flex-col gap-2 text-sm text-neutral-muted">
            <span>Chain</span>
            <select
              className="rounded-lg border border-border-neutral bg-neutral px-3 py-2 text-sm text-neutral-content focus:border-primary-content focus:outline-none focus:ring-1 focus:ring-primary-content"
              value={selectedChainId}
              onChange={(event) => {
                const nextId = Number(event.target.value);
                if (!Number.isNaN(nextId)) {
                  setSelectedChainId(nextId);
                }
              }}
            >
              {CHAINS.map((network) => (
                <option key={network.id} value={network.id}>
                  {network.name} ({network.id})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-neutral-muted">
            <span>Diamond address</span>
            <input
              className="rounded-lg border border-border-neutral bg-neutral px-3 py-2 text-sm text-neutral-content placeholder:text-neutral-muted focus:border-primary-content focus:outline-none focus:ring-1 focus:ring-primary-content"
              placeholder="0x..."
              value={addressInput}
              onChange={(event) => setAddressInput(event.target.value)}
            />
            {addressInput && !isAddressValid && (
              <span className="text-xs text-danger-content">
                Provide a valid Ethereum address.
              </span>
            )}
          </label>

          <div className="flex items-end justify-end">
            <Button
              btnStyle="filled"
              color="primary"
              onClick={handleInspectClick}
              disabled={!isAddressValid}
              className="w-full"
            >
              Inspect facets
            </Button>
          </div>
        </div>

        {isError && (
          <InfoBox infoBoxType="error" title="Unable to read facets">
            {error?.message ?
              error?.message
                .split("\n")
                .map((line) => <p key={line}>{line}</p>)
            : "The diamond does not expose loupe data."}
          </InfoBox>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border-neutral bg-neutral/10 p-4">
          <div>
            <p className="text-sm text-neutral-muted">Currently probing</p>
            <p className="text-base font-mono text-primary-content">
              {diamondAddress ?
                shortenAddress(diamondAddress)
              : "No diamond yet"}
            </p>
          </div>
          <div className="space-y-1 text-right text-xs text-neutral-muted">
            <p>Chain</p>
            <p className="text-sm text-neutral-content">
              {selectedChain?.name ?? "Unknown"} ({selectedChainId})
            </p>
          </div>
          <div className="space-y-1 text-right text-xs text-neutral-muted">
            <p>Facets</p>
            <p className="text-sm text-neutral-content">
              {facets.length.toLocaleString("en-US")}
            </p>
          </div>
          <div className="space-y-1 text-right text-xs text-neutral-muted">
            <p>Function selectors</p>
            <p className="text-sm text-neutral-content">
              {totalSelectors.toLocaleString("en-US")}
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border-neutral bg-neutral/5 p-4">
          {isFetching && !facets.length ?
            <LoadingSpinner className="py-10" size="loading-lg" />
          : <>
              {!diamondAddress && (
                <InfoBox
                  infoBoxType="info"
                  title="Start with a diamond address"
                >
                  Choose a chain and provide the diamond contract you want to
                  investigate. We will call the loupe facet to report every
                  facet currently registered.
                </InfoBox>
              )}

              {diamondAddress && !facets.length && !isFetching && (
                <InfoBox
                  infoBoxType="warning"
                  title="No facets returned"
                  content="The diamond returned an empty facet array."
                />
              )}

              {facets.length > 0 && (
                <div className="space-y-3">
                  {facets.map((facet, index) => (
                    <div
                      key={facet.facetAddress}
                      className="rounded-xl border border-border-neutral/40 bg-neutral/50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-neutral-muted">
                            Facet #{index + 1}
                          </p>
                          <p className="font-mono text-sm text-neutral-content">
                            {shortenAddress(facet.facetAddress)}
                          </p>
                        </div>
                        <p className="text-xs text-neutral-muted">
                          {facet.functionSelectors.length} selectors
                        </p>
                      </div>
                      {facet.functionSelectors.length > 0 ?
                        <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                          {facet.functionSelectors.map((selector) => (
                            <button
                              key={selector}
                              type="button"
                              className={`rounded border px-2 py-1 text-left font-mono text-xs ${
                                selectedSelector === selector ?
                                  "border-primary-content/80 bg-primary-content/10 text-primary-content"
                                : "border-border-neutral/50 bg-neutral/30 text-primary-content"
                              }`}
                              onClick={() => {
                                setSelectedSelector(selector);
                                const signatures = signatureMap[selector] ?? [];
                                if (signatures.length > 0) {
                                  setSelectedSignature(signatures[0]);
                                }
                              }}
                            >
                              <span>{selector}</span>
                              <span className="ml-2 text-[10px] text-neutral-muted">
                                {(signatureMap[selector] ?? [])[0] ?? "unknown"}
                              </span>
                            </button>
                          ))}
                        </div>
                      : <p className="mt-3 text-xs text-neutral-muted">
                          No selectors registered for this facet.
                        </p>
                      }
                    </div>
                  ))}
                </div>
              )}

              {diamondAddress && allSelectors.length > 0 && (
                <div className="rounded-xl border border-border-neutral/40 bg-neutral/50 p-4 space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-neutral-content">
                      Facet function runner
                    </p>
                    <p className="text-xs text-neutral-muted">
                      Resolve selectors and execute any function using manual
                      args.
                    </p>
                  </div>

                  {isResolvingSignatures && (
                    <p className="text-xs text-neutral-muted">
                      Resolving selectors...
                    </p>
                  )}

                  {signatureResolveError && (
                    <InfoBox
                      infoBoxType="warning"
                      title="Signature resolver warning"
                      content={signatureResolveError}
                    />
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs text-neutral-muted">
                      <span>Selector</span>
                      <select
                        className="rounded-lg border border-border-neutral bg-neutral px-3 py-2 text-sm text-neutral-content focus:border-primary-content focus:outline-none focus:ring-1 focus:ring-primary-content"
                        value={selectedSelector}
                        onChange={(event) => {
                          const selector = event.target.value;
                          setSelectedSelector(selector);
                          const signatures = signatureMap[selector] ?? [];
                          if (signatures.length) {
                            setSelectedSignature(signatures[0]);
                          }
                        }}
                      >
                        {allSelectors.map((selector) => (
                          <option key={selector} value={selector}>
                            {selector}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1 text-xs text-neutral-muted">
                      <span>Resolved signature</span>
                      <select
                        className="rounded-lg border border-border-neutral bg-neutral px-3 py-2 text-sm text-neutral-content focus:border-primary-content focus:outline-none focus:ring-1 focus:ring-primary-content"
                        value={selectedSignature}
                        onChange={(event) =>
                          setSelectedSignature(event.target.value)
                        }
                      >
                        {(signatureMap[selectedSelector] ?? []).length > 0 ?
                          (signatureMap[selectedSelector] ?? []).map(
                            (signature) => (
                              <option key={signature} value={signature}>
                                {signature}
                              </option>
                            ),
                          )
                        : <option value="">No signature found</option>}
                      </select>
                    </label>
                  </div>

                  <label className="flex flex-col gap-1 text-xs text-neutral-muted">
                    <span>Manual signature override</span>
                    <input
                      className="rounded-lg border border-border-neutral bg-neutral px-3 py-2 text-sm text-neutral-content placeholder:text-neutral-muted focus:border-primary-content focus:outline-none focus:ring-1 focus:ring-primary-content"
                      value={selectedSignature}
                      onChange={(event) =>
                        setSelectedSignature(event.target.value)
                      }
                      placeholder="e.g. getCommunityFee()"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs text-neutral-muted">
                    <span>Arguments (JSON array)</span>
                    <textarea
                      className="min-h-[88px] rounded-lg border border-border-neutral bg-neutral px-3 py-2 font-mono text-xs text-neutral-content placeholder:text-neutral-muted focus:border-primary-content focus:outline-none focus:ring-1 focus:ring-primary-content"
                      value={argsInput}
                      onChange={(event) => setArgsInput(event.target.value)}
                      placeholder='Example: ["0xabc...", "1000000000000000000"]'
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs text-neutral-muted">
                    <span>Value (wei, for write calls)</span>
                    <input
                      className="rounded-lg border border-border-neutral bg-neutral px-3 py-2 font-mono text-xs text-neutral-content placeholder:text-neutral-muted focus:border-primary-content focus:outline-none focus:ring-1 focus:ring-primary-content"
                      value={valueInput}
                      onChange={(event) => setValueInput(event.target.value)}
                      placeholder="0"
                    />
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      btnStyle="outline"
                      color={selectedFunctionKind === "read" ? "primary" : "secondary"}
                      className="sm:w-auto"
                      onClick={() => void executeFunction("read")}
                      isLoading={isExecutingRead}
                      disabled={!diamondAddress || !selectedSignature.trim()}
                    >
                      Call (eth_call)
                    </Button>
                    <Button
                      btnStyle="filled"
                      color="primary"
                      className="sm:w-auto"
                      onClick={() => void executeFunction("write")}
                      isLoading={isExecutingWrite || isSwitchingNetwork}
                      disabled={
                        !diamondAddress ||
                        !selectedSignature.trim() ||
                        selectedFunctionKind === "read" ||
                        !isConnected ||
                        !walletClient?.account
                      }
                    >
                      Send transaction
                    </Button>
                  </div>
                  <p className="text-xs text-neutral-muted">
                    Detected mode:{" "}
                    <span className="font-mono text-neutral-content">
                      {selectedFunctionKind}
                    </span>
                  </p>
                  {resolvedSelectedSignature && (
                    <p className="text-xs text-neutral-muted">
                      Using signature:{" "}
                      <span className="font-mono text-neutral-content">
                        {resolvedSelectedSignature}
                      </span>
                    </p>
                  )}

                  {!isConnected && (
                    <p className="text-xs text-neutral-muted">
                      Connect a wallet on {selectedChain?.name ?? "this chain"}{" "}
                      to send write transactions.
                    </p>
                  )}
                  {isConnected && chain?.id !== selectedChainId && (
                    <p className="text-xs text-neutral-muted">
                      Wallet network ({chain?.name ?? chain?.id}) will switch to{" "}
                      {selectedChain?.name ?? selectedChainId} before sending.
                    </p>
                  )}

                  {executionError && (
                    <InfoBox
                      infoBoxType="error"
                      title="Execution error"
                      content={executionError}
                    />
                  )}

                  {readOutput && (
                    <div className="space-y-1">
                      <p className="text-xs text-neutral-muted">Call result</p>
                      <pre className="overflow-auto rounded-lg border border-border-neutral/50 bg-neutral/30 p-3 text-xs text-neutral-content">
                        {readOutput}
                      </pre>
                    </div>
                  )}

                  {txHash && (
                    <div className="space-y-1 text-xs text-neutral-muted">
                      <p>Transaction sent</p>
                      <p className="font-mono text-neutral-content break-all">
                        {txHash}
                      </p>
                      {txExplorerBase && (
                        <a
                          href={`${txExplorerBase}/tx/${txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary-content underline"
                        >
                          View on explorer
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          }
        </div>
      </section>
    </div>
  );
}
