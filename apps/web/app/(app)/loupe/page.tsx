"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { AbiFunction, AbiParameter } from "abitype";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Address,
  decodeErrorResult,
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
  useWalletClient,
} from "wagmi";
import communityAdminFacetArtifact from "#/contracts/abis/CommunityAdminFacet.sol/CommunityAdminFacet.json";
import communityMemberFacetArtifact from "#/contracts/abis/CommunityMemberFacet.sol/CommunityMemberFacet.json";
import communityPauseFacetArtifact from "#/contracts/abis/CommunityPauseFacet.sol/CommunityPauseFacet.json";
import communityPoolFacetArtifact from "#/contracts/abis/CommunityPoolFacet.sol/CommunityPoolFacet.json";
import communityPowerFacetArtifact from "#/contracts/abis/CommunityPowerFacet.sol/CommunityPowerFacet.json";
import communityStrategyFacetArtifact from "#/contracts/abis/CommunityStrategyFacet.sol/CommunityStrategyFacet.json";
import cvAdminFacetArtifact from "#/contracts/abis/CVAdminFacet.sol/CVAdminFacet.json";
import cvAllocationFacetArtifact from "#/contracts/abis/CVAllocationFacet.sol/CVAllocationFacet.json";
import cvDisputeFacetArtifact from "#/contracts/abis/CVDisputeFacet.sol/CVDisputeFacet.json";
import cvPauseFacetArtifact from "#/contracts/abis/CVPauseFacet.sol/CVPauseFacet.json";
import cvPowerFacetArtifact from "#/contracts/abis/CVPowerFacet.sol/CVPowerFacet.json";
import cvProposalFacetArtifact from "#/contracts/abis/CVProposalFacet.sol/CVProposalFacet.json";
import cvStreamingFacetArtifact from "#/contracts/abis/CVStreamingFacet.sol/CVStreamingFacet.json";
import cvSyncPowerFacetArtifact from "#/contracts/abis/CVSyncPowerFacet.sol/CVSyncPowerFacet.json";
import diamondLoupeFacetArtifact from "#/contracts/abis/DiamondLoupeFacet.sol/DiamondLoupeFacet.json";
import globalPauseControllerArtifact from "#/contracts/abis/GlobalPauseController.sol/GlobalPauseController.json";
import proxyOwnableUpgraderArtifact from "#/contracts/abis/ProxyOwnableUpgrader.sol/ProxyOwnableUpgrader.json";
import proxyOwnerArtifact from "#/contracts/abis/ProxyOwner.sol/ProxyOwner.json";
import streamingEscrowFactoryArtifact from "#/contracts/abis/StreamingEscrowFactory.sol/StreamingEscrowFactory.json";
import { Button } from "@/components/Button";
import { InfoBox } from "@/components/InfoBox";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { CHAINS } from "@/configs/chains";
import { useAppSwitchNetwork } from "@/hooks/useAppSwitchNetwork";
import {
  alloABI,
  cvStrategyABI,
  erc20ABI,
  goodDollarABI,
  iArbitratorABI,
  passportScorerABI,
  registryCommunityABI,
  registryFactoryABI,
  safeArbitratorABI,
} from "@/src/generated";
import { shortenAddress } from "@/utils/text";

type DiamondFacet = {
  facetAddress: Address;
  functionSelectors: string[];
};

type SignatureMap = Record<string, string[]>;
type GeneratedArgField = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "checkbox" | "group";
  placeholder: string;
  helper: string;
  value: unknown;
  path: number[];
  parameter: AbiParameter;
  children?: GeneratedArgField[];
};
type KnownFacetDefinition = {
  label: string;
  selectors: string[];
};
const EMPTY_FACETS: DiamondFacet[] = [];
const KNOWN_ABI_CATALOG = [
  { label: "Allo", abi: alloABI },
  { label: "ERC20", abi: erc20ABI },
  { label: "GoodDollar", abi: goodDollarABI },
  { label: "IArbitrator", abi: iArbitratorABI },
  { label: "PassportScorer", abi: passportScorerABI },
  { label: "ProxyOwnableUpgrader", abi: proxyOwnableUpgraderArtifact.abi },
  { label: "ProxyOwner", abi: proxyOwnerArtifact.abi },
  { label: "RegistryFactory", abi: registryFactoryABI },
  { label: "RegistryCommunity", abi: registryCommunityABI },
  { label: "SafeArbitrator", abi: safeArbitratorABI },
  { label: "StreamingEscrowFactory", abi: streamingEscrowFactoryArtifact.abi },
  { label: "CVStrategy", abi: cvStrategyABI },
  { label: "GlobalPauseController", abi: globalPauseControllerArtifact.abi },
] as const;
const KNOWN_FACET_ABI_CATALOG = [
  { label: "CommunityAdminFacet", abi: communityAdminFacetArtifact.abi },
  { label: "CommunityMemberFacet", abi: communityMemberFacetArtifact.abi },
  { label: "CommunityPoolFacet", abi: communityPoolFacetArtifact.abi },
  { label: "CommunityPowerFacet", abi: communityPowerFacetArtifact.abi },
  { label: "CommunityStrategyFacet", abi: communityStrategyFacetArtifact.abi },
  { label: "CommunityPauseFacet", abi: communityPauseFacetArtifact.abi },
  { label: "CVAdminFacet", abi: cvAdminFacetArtifact.abi },
  { label: "CVAllocationFacet", abi: cvAllocationFacetArtifact.abi },
  { label: "CVDisputeFacet", abi: cvDisputeFacetArtifact.abi },
  { label: "CVPowerFacet", abi: cvPowerFacetArtifact.abi },
  { label: "CVProposalFacet", abi: cvProposalFacetArtifact.abi },
  { label: "CVPauseFacet", abi: cvPauseFacetArtifact.abi },
  { label: "CVStreamingFacet", abi: cvStreamingFacetArtifact.abi },
  { label: "CVSyncPowerFacet", abi: cvSyncPowerFacetArtifact.abi },
  { label: "DiamondLoupeFacet", abi: diamondLoupeFacetArtifact.abi },
] as const;

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

const extractRevertData = (error: unknown): `0x${string}` | null => {
  if (error == null || typeof error !== "object") return null;

  const candidate = error as Record<string, unknown>;
  const directData = candidate.data;
  if (
    typeof directData === "string" &&
    directData.startsWith("0x") &&
    directData.length >= 10
  ) {
    return directData as `0x${string}`;
  }

  const details = candidate.details;
  if (typeof details === "string") {
    const match = details.match(/0x[a-fA-F0-9]{8,}/);
    if (match) {
      return match[0] as `0x${string}`;
    }
  }

  return extractRevertData(candidate.cause);
};

const parseFunctionFromSignature = (signature: string) =>
  parseAbiItem(`function ${signature.trim()}`) as AbiFunction;

const toCanonicalSignature = (abiFunction: AbiFunction) =>
  `${abiFunction.name}(${(abiFunction.inputs ?? []).map((input: AbiParameter) => input.type).join(",")})`;

const selectorFromSignature = (signature: string) =>
  keccak256(stringToHex(signature)).slice(0, 10).toLowerCase();

const getTypeWithoutArraySuffix = (type: string) => type.replace(/\[\]$/g, "");

const getArrayDepth = (type: string) => (type.match(/\[\]/g) ?? []).length;

const stringifyFieldValue = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") return value;
  if (value == null) return "";
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

const getTupleChildValue = (
  value: unknown,
  component: AbiParameter,
  index: number,
) => {
  if (Array.isArray(value)) {
    return value[index];
  }
  if (value != null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    if (component.name && source[component.name] !== undefined) {
      return source[component.name];
    }
    return source[String(index)];
  }
  return undefined;
};

const getParameterInputKind = (
  parameter: AbiParameter,
): GeneratedArgField["kind"] => {
  if (parameter.type === "bool") return "checkbox";
  if (parameter.type === "tuple" && !parameter.type.includes("[")) {
    return "group";
  }
  if (parameter.type.includes("[") || parameter.type === "tuple") {
    return "textarea";
  }
  return "text";
};

const getParameterPlaceholder = (parameter: AbiParameter) => {
  if (parameter.type === "address") return "0x...";
  if (parameter.type === "bool") return "";
  if (parameter.type.startsWith("uint") || parameter.type.startsWith("int")) {
    return "0";
  }
  if (parameter.type === "string") return "text";
  if (parameter.type.startsWith("bytes")) return "0x";
  if (parameter.type.includes("[") || parameter.type === "tuple") {
    return parameter.type.includes("[") ? '["value1","value2"]' : '{"field":"value"}';
  }
  return parameter.type;
};

const getParameterHelper = (parameter: AbiParameter) => {
  if (parameter.type === "bool") return "Boolean toggle";
  if (parameter.type.startsWith("uint") || parameter.type.startsWith("int")) {
    return "Enter an integer value";
  }
  if (parameter.type === "address") return "Ethereum address";
  if (parameter.type.startsWith("bytes")) return "Hex value";
  if (parameter.type.includes("[") || parameter.type === "tuple") {
    return "Provide JSON matching the ABI type";
  }
  return parameter.type;
};

const getAbiProbeFunctions = (abi: readonly unknown[]) =>
  abi
    .filter(isAbiFunctionItem)
    .map((item) => item as AbiFunction)
    .filter((fn) => {
      const mutability = fn.stateMutability;
      return (
        (mutability === "view" || mutability === "pure") &&
        (fn.inputs?.length ?? 0) === 0 &&
        (fn.outputs?.length ?? 0) > 0
      );
    })
    .slice(0, 5);

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

const parseFieldValueForParameter = (
  rawValue: unknown,
  parameter: AbiParameter,
): unknown => {
  if (parameter.type === "tuple" && isTupleParameter(parameter)) {
    if (Array.isArray(rawValue)) {
      return parameter.components.map((component, index) =>
        parseFieldValueForParameter(rawValue[index], component),
      );
    }
    if (rawValue != null && typeof rawValue === "object") {
      return parameter.components.map((component, index) =>
        parseFieldValueForParameter(
          getTupleChildValue(rawValue, component, index),
          component,
        ),
      );
    }
  }

  if (parameter.type === "bool") {
    return Boolean(rawValue);
  }

  if (typeof rawValue !== "string") return rawValue;

  const trimmed = rawValue.trim();
  if (trimmed === "") return trimmed;

  if (parameter.type.includes("[") || parameter.type === "tuple") {
    return JSON.parse(trimmed);
  }

  if (parameter.type.startsWith("uint") || parameter.type.startsWith("int")) {
    return BigInt(trimmed);
  }

  return trimmed;
};

const parseBoolish = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return value;
};

const isTupleParameter = (
  parameter: AbiParameter,
): parameter is AbiParameter & { components: readonly AbiParameter[] } =>
  "components" in parameter && Array.isArray(parameter.components);

const isAbiFunctionItem = (item: unknown): item is AbiFunction =>
  Boolean(
    item &&
      typeof item === "object" &&
      "type" in item &&
      "name" in item &&
      (item as { type?: unknown }).type === "function",
  );

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
    return value.map((entry) =>
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
    const components = isTupleParameter(parameter) ? parameter.components : [];
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
  inputs.map((input, index) =>
    normalizeValueForParameter(rawArgs[index], input),
  );

const buildGeneratedArgFields = (
  parameters: readonly AbiParameter[],
  values: unknown[],
  pathPrefix: number[] = [],
): GeneratedArgField[] =>
  parameters.map((input, index) => {
    const path = [...pathPrefix, index];
    const value = values[index];
    const kind = getParameterInputKind(input);

    if (kind === "group" && isTupleParameter(input)) {
      const childValues = input.components.map((component, childIndex) => {
        const childValue = getTupleChildValue(value, component, childIndex);
        if (childValue === undefined) {
          return component.type === "bool" ? false : "";
        }
        if (component.type === "tuple" && !component.type.includes("[")) {
          return childValue;
        }
        return stringifyFieldValue(childValue);
      });

      return {
        key: `${input.name ?? "arg"}-${path.join("-")}`,
        label:
          input.name?.trim() ?
            `${input.name} (${input.type})`
          : `arg${index} (${input.type})`,
        kind,
        placeholder: getParameterPlaceholder(input),
        helper: getParameterHelper(input),
        value,
        path,
        parameter: input,
        children: buildGeneratedArgFields(
          input.components,
          childValues,
          path,
        ),
      };
    }

    return {
      key: `${input.name ?? "arg"}-${path.join("-")}`,
      label:
        input.name?.trim() ?
          `${input.name} (${input.type})`
        : `arg${index} (${input.type})`,
      kind,
      placeholder: getParameterPlaceholder(input),
      helper: getParameterHelper(input),
      value,
      path,
      parameter: input,
    };
  });

const setNestedPathValue = (
  values: unknown[],
  path: number[],
  nextValue: unknown,
): unknown[] => {
  const [head, ...tail] = path;
  const cloned = [...values];

  if (tail.length === 0) {
    cloned[head] = nextValue;
    return cloned;
  }

  const current = cloned[head];
  const container =
    current != null && typeof current === "object" ?
      { ...(current as Record<string, unknown>) }
    : {};

  let cursor: Record<string, unknown> = container;
  for (let index = 0; index < tail.length - 1; index += 1) {
    const segment = String(tail[index]);
    const currentValue =
      cursor[segment] != null && typeof cursor[segment] === "object" ?
        { ...(cursor[segment] as Record<string, unknown>) }
      : {};
    cursor[segment] = currentValue;
    cursor = currentValue;
  }
  cursor[String(tail[tail.length - 1])] = nextValue;
  cloned[head] = container;
  return cloned;
};

const GeneratedArgFieldEditor = ({
  field,
  onChange,
}: {
  field: GeneratedArgField;
  onChange: (path: number[], value: unknown) => void;
}) => {
  const [customZeroCount, setCustomZeroCount] = useState("6");

  if (field.kind === "group") {
    return (
      <div className="rounded-xl border border-border-neutral/40 bg-neutral/20 p-3">
        <div className="mb-3">
          <p className="text-xs font-semibold text-neutral-content">
            {field.label}
          </p>
          <p className="text-[10px] text-neutral-muted">{field.helper}</p>
        </div>
        <div className="grid gap-3 pl-3">
          {(field.children ?? []).map((child) => (
            <GeneratedArgFieldEditor
              key={child.key}
              field={child}
              onChange={onChange}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <label className="flex flex-col gap-1 text-xs text-neutral-muted">
      <span>{field.label}</span>
      {field.kind === "checkbox" ?
        <input
          type="checkbox"
          className="checkbox checkbox-info h-5 w-5 rounded-md border-2 border-neutral-soft-content"
          checked={Boolean(field.value)}
          onChange={(event) => onChange(field.path, event.target.checked)}
        />
      : field.kind === "textarea" ?
        <textarea
          className="min-h-[88px] rounded-lg border border-border-neutral bg-neutral px-3 py-2 font-mono text-xs text-neutral-content placeholder:text-neutral-muted focus:border-primary-content focus:outline-none focus:ring-1 focus:ring-primary-content"
          value={String(field.value ?? "")}
          placeholder={field.placeholder}
          onChange={(event) => onChange(field.path, event.target.value)}
        />
      : <input
          className="rounded-lg border border-border-neutral bg-neutral px-3 py-2 font-mono text-xs text-neutral-content placeholder:text-neutral-muted focus:border-primary-content focus:outline-none focus:ring-1 focus:ring-primary-content"
          value={String(field.value ?? "")}
          placeholder={field.placeholder}
          onChange={(event) => onChange(field.path, event.target.value)}
        />
      }
      {field.parameter.type.match(/^(u?int)([0-9]+)?$/) && field.kind === "text" && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded border border-border-neutral/60 px-2 py-1 font-mono text-[10px] text-neutral-content hover:border-primary-content hover:text-primary-content"
            onClick={() =>
              onChange(field.path, `${String(field.value ?? "")}${"0".repeat(18)}`)
            }
          >
            +18 decimals
          </button>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              className="w-16 rounded border border-border-neutral bg-neutral px-2 py-1 font-mono text-[10px] text-neutral-content placeholder:text-neutral-muted focus:border-primary-content focus:outline-none focus:ring-1 focus:ring-primary-content"
              value={customZeroCount}
              onChange={(event) => setCustomZeroCount(event.target.value)}
            />
            <button
              type="button"
              className="rounded border border-border-neutral/60 px-2 py-1 font-mono text-[10px] text-neutral-content hover:border-primary-content hover:text-primary-content"
              onClick={() => {
                const zeroCount = Number(customZeroCount);
                if (!Number.isInteger(zeroCount) || zeroCount <= 0) return;
                onChange(
                  field.path,
                  `${String(field.value ?? "")}${"0".repeat(zeroCount)}`,
                );
              }}
            >
              +custom decimals
            </button>
          </div>
        </div>
      )}
      <span className="text-[10px] text-neutral-muted">{field.helper}</span>
    </label>
  );
};

export default function DiamondAdminPage() {
  const [addressInput, setAddressInput] = useState("");
  const [diamondAddress, setDiamondAddress] = useState<Address>();
  const [selectedChainId, setSelectedChainId] = useState<number>(
    42161,
  );
  const [signatureMap, setSignatureMap] = useState<SignatureMap>({});
  const [isResolvingSignatures, setIsResolvingSignatures] = useState(false);
  const [signatureResolveError, setSignatureResolveError] = useState<
    string | null
  >(null);
  const [selectedSelector, setSelectedSelector] = useState("");
  const [selectedSignature, setSelectedSignature] = useState("");
  const [isManualSignatureOverride, setIsManualSignatureOverride] =
    useState(false);
  const [argsInput, setArgsInput] = useState("[]");
  const [argFieldValues, setArgFieldValues] = useState<unknown[]>([]);
  const [valueInput, setValueInput] = useState("0");
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [readOutput, setReadOutput] = useState<string | null>(null);
  const [simulationOutput, setSimulationOutput] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isExecutingRead, setIsExecutingRead] = useState(false);
  const [isSimulatingWrite, setIsSimulatingWrite] = useState(false);
  const [isExecutingWrite, setIsExecutingWrite] = useState(false);
  const [probedProxyAbiLabel, setProbedProxyAbiLabel] = useState<string | null>(
    null,
  );
  const [selectedProxyAbiLabel, setSelectedProxyAbiLabel] = useState("");
  const didApplyQueryParamsRef = useRef(false);
  const functionRunnerRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isAddressValid = Boolean(addressInput) && isAddress(addressInput);
  const publicClient = usePublicClient({ chainId: selectedChainId });
  const { data: walletClient } = useWalletClient({ chainId: selectedChainId });
  const { chain } = useNetwork();
  const { switchNetworkAsync, isLoading: isSwitchingNetwork } =
    useAppSwitchNetwork();
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
  const loupeReadFailed = Boolean(diamondAddress) && isError;
  const supportsDiamondLoupe = facets.length > 0;
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
            facet.functionSelectors.filter((selector: string) =>
              SELECTOR_REGEX.test(selector),
            ),
          ),
        ),
      ).sort(),
    [facets],
  );

  const selectedChain = CHAINS.find((entry) => entry.id === selectedChainId);
  const knownAbiFunctions = useMemo<AbiFunction[]>(
    () =>
      KNOWN_ABI_CATALOG.flatMap(({ abi }) => abi as readonly unknown[])
        .filter(isAbiFunctionItem)
        .map((item) => item as AbiFunction),
    [],
  );

  const selectorInferredProxyAbi = useMemo(() => {
    const facetSelectorSet = new Set(allSelectors.map((selector) => selector.toLowerCase()));

    const candidates = KNOWN_ABI_CATALOG.map(({ label, abi }) => {
      const functions = abi
        .filter(isAbiFunctionItem)
        .map((item) => item as AbiFunction);
      const uniqueFunctions = Array.from(
        new Map(
          functions.map((fn) => [toCanonicalSignature(fn), fn] as const),
        ).values(),
      );
      const selectors = uniqueFunctions.map((fn) =>
        selectorFromSignature(toCanonicalSignature(fn)),
      );
      const overlapCount = selectors.filter((selector) =>
        facetSelectorSet.has(selector),
      ).length;

      return {
        label,
        functions: uniqueFunctions,
        overlapCount,
      };
    });

    return candidates.sort((a, b) => b.overlapCount - a.overlapCount)[0] ?? null;
  }, [allSelectors]);

  useEffect(() => {
    if (!diamondAddress || publicClient == null) {
      setProbedProxyAbiLabel(null);
      return;
    }

    if (allSelectors.length > 0) {
      setProbedProxyAbiLabel(null);
      return;
    }

    let isActive = true;

    const probeAbiSurface = async () => {
      const candidateScores = await Promise.all(
        KNOWN_ABI_CATALOG.map(async ({ label, abi }) => {
          const probeFunctions = getAbiProbeFunctions(abi);
          let successCount = 0;

          for (const fn of probeFunctions) {
            try {
              const data = encodeFunctionData({
                abi: [fn],
                functionName: fn.name,
              });
              const response = await publicClient.call({
                to: diamondAddress,
                data,
              });
              if (response.data != null && response.data !== "0x") {
                successCount += 1;
              }
            } catch {
              // Ignore failed probe calls and continue scoring other signatures.
            }
          }

          return {
            label,
            successCount,
          };
        }),
      );

      const bestCandidate = candidateScores.sort((a, b) => {
        if (a.successCount === b.successCount) {
          return a.label.localeCompare(b.label);
        }
        return b.successCount - a.successCount;
      })[0];

      if (isActive) {
        setProbedProxyAbiLabel(
          bestCandidate != null && bestCandidate.successCount > 0 ?
            bestCandidate.label
          : null,
        );
      }
    };

    void probeAbiSurface();

    return () => {
      isActive = false;
    };
  }, [allSelectors.length, diamondAddress, publicClient]);

  const inferredProxyAbi = useMemo(() => {
    if (allSelectors.length > 0) {
      return selectorInferredProxyAbi;
    }

    if (probedProxyAbiLabel == null) return null;

    const candidate = KNOWN_ABI_CATALOG.find(
      ({ label }) => label === probedProxyAbiLabel,
    );

    if (!candidate) return null;

    const functions = candidate.abi
      .filter(isAbiFunctionItem)
      .map((item) => item as AbiFunction);

    return {
      label: candidate.label,
      functions: Array.from(
        new Map(
          functions.map((fn) => [toCanonicalSignature(fn), fn] as const),
        ).values(),
      ),
      overlapCount: 0,
    };
  }, [allSelectors.length, probedProxyAbiLabel, selectorInferredProxyAbi]);

  const effectiveProxyAbi = useMemo(() => {
    const selectedCandidate =
      selectedProxyAbiLabel ?
        KNOWN_ABI_CATALOG.find(({ label }) => label === selectedProxyAbiLabel)
      : undefined;

    if (selectedCandidate) {
      const functions = selectedCandidate.abi
        .filter(isAbiFunctionItem)
        .map((item) => item as AbiFunction);

      return {
        label: selectedCandidate.label,
        functions: Array.from(
          new Map(
            functions.map((fn) => [toCanonicalSignature(fn), fn] as const),
          ).values(),
        ),
        overlapCount: 0,
      };
    }

    return inferredProxyAbi;
  }, [inferredProxyAbi, selectedProxyAbiLabel]);

  const proxyFunctions = useMemo(() => {
    if (effectiveProxyAbi == null) return [];

    return Array.from(
      new Map(
        effectiveProxyAbi.functions.map(
          (fn) => [toCanonicalSignature(fn), fn] as const,
        ),
      ).values(),
    )
      .filter((fn) => {
        const selector = selectorFromSignature(toCanonicalSignature(fn));
        return !allSelectors.includes(selector);
      })
      .sort((a, b) => {
        if (a.name === b.name) {
          return toCanonicalSignature(a).localeCompare(toCanonicalSignature(b));
        }
        return a.name.localeCompare(b.name);
      });
  }, [allSelectors, effectiveProxyAbi]);

  const availableSelectors = useMemo(
    () =>
      Array.from(
        new Set([
          ...allSelectors,
          ...proxyFunctions.map((fn) =>
            selectorFromSignature(toCanonicalSignature(fn)),
          ),
        ]),
      ).sort(),
    [allSelectors, proxyFunctions],
  );

  const knownFacetCatalog = useMemo<KnownFacetDefinition[]>(
    () =>
      KNOWN_FACET_ABI_CATALOG.map(({ label, abi }) => ({
        label,
        selectors: Array.from(
          new Set(
            (abi as readonly unknown[])
              .filter(isAbiFunctionItem)
              .map((item) => toCanonicalSignature(item as AbiFunction))
              .map(selectorFromSignature),
          ),
        ),
      })),
    [],
  );

  const knownErrorAbi = useMemo(
    () =>
      [
        ...KNOWN_ABI_CATALOG.flatMap(
          ({ abi }) => abi as readonly unknown[],
        ),
        ...KNOWN_FACET_ABI_CATALOG.flatMap(
          ({ abi }) => abi as readonly unknown[],
        ),
      ].filter(
        (item) =>
          item != null &&
          typeof item === "object" &&
          "type" in item &&
          (item as { type?: unknown }).type === "error",
      ) as readonly unknown[],
    [],
  );

  const facetsWithNames = useMemo(
    () =>
      facets.map((facet) => {
        const selectorSet = new Set(
          facet.functionSelectors.map((selector) => selector.toLowerCase()),
        );
        const bestMatch = knownFacetCatalog
          .map((knownFacet) => ({
            label: knownFacet.label,
            overlap: knownFacet.selectors.filter((selector) =>
              selectorSet.has(selector),
            ).length,
          }))
          .sort((a, b) => b.overlap - a.overlap)[0];

        return {
          ...facet,
          inferredName:
            bestMatch != null && bestMatch.overlap > 0 ?
              bestMatch.label
            : undefined,
        };
      }),
    [facets, knownFacetCatalog],
  );

  const knownFunctionBySignature = useMemo(() => {
    const entries = knownAbiFunctions.map(
      (fn) => [toCanonicalSignature(fn), fn] as const,
    );
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

  const localSignatureMap = useMemo<SignatureMap>(() => {
    const map: SignatureMap = {};
    knownAbiFunctions.forEach((fn) => {
      const signature = toCanonicalSignature(fn);
      const selector = selectorFromSignature(signature);
      map[selector] = Array.from(
        new Set([...(map[selector] ?? []), signature]),
      );
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

  const availableSignaturesForSelectedSelector = useMemo(
    () => Array.from(new Set(signatureMap[selectedSelector] ?? [])),
    [selectedSelector, signatureMap],
  );

  const selectedAbiFunction = useMemo(() => {
    if (selectedKnownFunction) return selectedKnownFunction;
    if (!selectedSignature.trim()) return null;
    try {
      return parseFunctionFromSignature(selectedSignature);
    } catch {
      return null;
    }
  }, [selectedKnownFunction, selectedSignature]);

  const generatedArgFields = useMemo<GeneratedArgField[]>(() => {
    if (!selectedAbiFunction) return [];
    const inputValues = (selectedAbiFunction.inputs ?? []).map((input, index) => {
      const current = argFieldValues[index];
      if (current !== undefined) return current;
      return input.type === "bool" ? false : "";
    });

    return buildGeneratedArgFields(
      selectedAbiFunction.inputs ?? [],
      inputValues,
    );
  }, [argFieldValues, selectedAbiFunction]);

  const syncArgTextareaFromFields = (
    nextValues: unknown[],
    functionAbi: AbiFunction | null,
  ) => {
    if (!functionAbi) return;

    try {
      const parsedArgs = (functionAbi.inputs ?? []).map((input, index) =>
        parseFieldValueForParameter(nextValues[index] ?? "", input),
      );
      setArgsInput(
        JSON.stringify(
          parsedArgs,
          (_, item) => (typeof item === "bigint" ? item.toString() : item),
          2,
        ),
      );
    } catch {
      // Keep the current raw JSON while the user is typing invalid input.
    }
  };

  useEffect(() => {
    if (!selectedAbiFunction) {
      setArgFieldValues([]);
      return;
    }

    const inputs = selectedAbiFunction.inputs ?? [];
    let parsedArgs: unknown[] = [];
    try {
      const maybeArgs = JSON.parse(argsInput || "[]");
      if (Array.isArray(maybeArgs)) {
        parsedArgs = maybeArgs;
      }
    } catch {
      parsedArgs = [];
    }

    setArgFieldValues(
      inputs.map((input, index) => {
        const current = parsedArgs[index];
        if (current === undefined) {
          return input.type === "bool" ? false : "";
        }
        if (input.type === "tuple" && !input.type.includes("[")) {
          return current;
        }
        return stringifyFieldValue(current);
      }),
    );
  }, [argsInput, selectedAbiFunction]);

  const queryParams = useMemo(
    () => ({
      chainId: searchParams.get("chainId") ?? undefined,
      chain: searchParams.get("chain") ?? undefined,
      address: searchParams.get("address") ?? undefined,
      diamond: searchParams.get("diamond") ?? undefined,
      selector: searchParams.get("selector") ?? undefined,
      signature: searchParams.get("signature") ?? undefined,
      args: searchParams.get("args") ?? undefined,
      value: searchParams.get("value") ?? undefined,
    }),
    [searchParams],
  );

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
          const resolvedSelectors = payload.selectors ?? {};
          const mergedMap = allSelectors.reduce<SignatureMap>((acc, selector) => {
            const localSignatures = localSignatureMap[selector] ?? [];
            const resolvedSignatures = resolvedSelectors[selector] ?? [];
            acc[selector] =
              localSignatures.length > 0 ?
                localSignatures
              : resolvedSignatures;
            return acc;
          }, {});
          setSignatureMap(mergedMap);
        }
      } catch (resolveError) {
        if (isActive) {
          const message =
            resolveError instanceof Error ?
              resolveError.message
            : "Unknown resolver error";
          setSignatureResolveError(message);
          setSignatureMap(
            allSelectors.reduce<SignatureMap>((acc, selector) => {
              const localSignatures = localSignatureMap[selector] ?? [];
              if (localSignatures.length > 0) {
                acc[selector] = localSignatures;
              }
              return acc;
            }, {}),
          );
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
  }, [allSelectors, localSignatureMap]);

  useEffect(() => {
    if (!availableSelectors.length) {
      setSelectedSelector("");
      setSelectedSignature("");
      return;
    }
    if (isManualSignatureOverride) {
      return;
    }
    if (!selectedSelector || !availableSelectors.includes(selectedSelector)) {
      setSelectedSelector(availableSelectors[0]);
    }
  }, [availableSelectors, isManualSignatureOverride, selectedSelector]);

  useEffect(() => {
    if (isManualSignatureOverride) {
      return;
    }
    if (!selectedSelector) {
      // Don't clear signature when selector is empty - user may be typing manual override
      return;
    }
    const localCandidates = localSignatureMap[selectedSelector] ?? [];
    const candidates =
      localCandidates.length > 0 ?
        localCandidates
      : availableSignaturesForSelectedSelector;
    if (!candidates.length) {
      return;
    }
    if (!selectedSignature) {
      setSelectedSignature(candidates[0]);
      return;
    }
    // If the signature is in candidates, no change needed
    if (candidates.includes(selectedSignature)) {
      return;
    }
    // If the signature is manually entered and valid, preserve it
    try {
      parseFunctionFromSignature(selectedSignature);
      // It's a valid function signature, keep it
      return;
    } catch {
      // Invalid signature, reset to first candidate
      setSelectedSignature(candidates[0]);
    }
  }, [
    availableSignaturesForSelectedSelector,
    isManualSignatureOverride,
    localSignatureMap,
    selectedSelector,
    selectedSignature,
  ]);

  useEffect(() => {
    if (isManualSignatureOverride) {
      return;
    }
    if (!selectedSignature.trim()) {
      return;
    }
    try {
      const parsed = parseFunctionFromSignature(selectedSignature);
      const selector = selectorFromSignature(toCanonicalSignature(parsed));
      if (selector !== selectedSelector) {
        setSelectedSelector(selector);
      }
    } catch {
      // Ignore invalid signatures while typing.
    }
  }, [isManualSignatureOverride, selectedSelector, selectedSignature]);

  const handleInspectClick = () => {
    if (!isAddressValid) return;
    const normalized = addressInput as Address;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("chainId", String(selectedChainId));
    nextParams.set("address", normalized);
    nextParams.delete("diamond");
    nextParams.delete("chain");
    nextParams.delete("selector");
    nextParams.delete("signature");
    nextParams.delete("args");
    nextParams.delete("value");
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    if (diamondAddress === normalized) {
      refetch?.();
      return;
    }
    setSignatureMap({});
    setIsManualSignatureOverride(false);
    setSelectedProxyAbiLabel("");
    setSelectedSelector("");
    setSelectedSignature("");
    setExecutionError(null);
    setReadOutput(null);
    setTxHash(null);
    setSimulationOutput(null);
    setDiamondAddress(normalized);
  };

  const handleFunctionSelect = (selector: string, signature?: string) => {
    setIsManualSignatureOverride(false);
    setSelectedSelector(selector);
    if (signature !== undefined) {
      setSelectedSignature(signature);
    }
    requestAnimationFrame(() => {
      functionRunnerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const executeFunction = async (mode: "read" | "simulate" | "write") => {
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
    } else if (mode === "simulate") {
      setIsSimulatingWrite(true);
    } else {
      setIsExecutingWrite(true);
    }
    setExecutionError(null);
    setReadOutput(null);
    setSimulationOutput(null);
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
            rawResult !== "0x" ?
              `Raw return data:\n${rawResult}`
            : "No return value (0x)",
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

      if (mode === "simulate") {
        if (!walletClient?.account) {
          throw new Error(
            "Connect a wallet on the selected chain to simulate write transactions.",
          );
        }
        if (selectedFunctionKind === "read") {
          throw new Error(
            "Detected read-only function. Use Call (eth_call), no simulation needed.",
          );
        }

        const sanitizedValue = valueInput.trim();
        const value =
          sanitizedValue && DECIMAL_REGEX.test(sanitizedValue) ?
            BigInt(sanitizedValue)
          : 0n;

        const response = await publicClient.call({
          account: walletClient.account.address,
          to: diamondAddress,
          data,
          value,
        });
        const rawResult = response.data ?? "0x";
        if ((functionAbi.outputs ?? []).length === 0) {
          setSimulationOutput(
            rawResult !== "0x" ?
              `Simulation succeeded.\nRaw return data:\n${rawResult}`
            : "Simulation succeeded (no return value).",
          );
          return;
        }
        const decoded = decodeFunctionResult({
          abi,
          functionName: functionAbi.name,
          data: rawResult,
        });
        setSimulationOutput(
          `Simulation succeeded.\n${stringifyResult(decoded)}`,
        );
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
      const revertData = extractRevertData(runError);
      let message =
        runError instanceof Error ?
          runError.message
        : "Unknown execution error";

      if (revertData != null) {
        try {
          const decodedError = decodeErrorResult({
            abi: knownErrorAbi,
            data: revertData,
          });
          const decodedArgs =
            decodedError.args == null ?
              ""
            : `\n${stringifyResult(decodedError.args)}`;
          message =
            `Decoded custom error: ${decodedError.errorName}${decodedArgs}\n\n` +
            `Raw revert data: ${revertData}\n\n` +
            message;
        } catch {
          message = `Raw revert data: ${revertData}\n\n${message}`;
        }
      }
      setExecutionError(message);
    } finally {
      setIsExecutingRead(false);
      setIsSimulatingWrite(false);
      setIsExecutingWrite(false);
    }
  };

  const txExplorerBase = selectedChain?.blockExplorers?.default?.url;
  const getExplorerAddressHref = (address?: Address) =>
    txExplorerBase && address ? `${txExplorerBase}/address/${address}` : null;

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
              Inspect
            </Button>
          </div>
        </div>

      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border-neutral bg-neutral/10 p-4">
          <div>
            <p className="text-sm text-neutral-muted">Currently probing</p>
            <p className="text-base font-mono text-primary-content">
              {diamondAddress ?
                getExplorerAddressHref(diamondAddress) ?
                  <a
                    href={getExplorerAddressHref(diamondAddress) ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-border-neutral/60 underline-offset-2 transition hover:text-primary-content/80"
                  >
                    {shortenAddress(diamondAddress)}
                  </a>
                : shortenAddress(diamondAddress)
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
              {supportsDiamondLoupe ? facets.length.toLocaleString("en-US") : "n/a"}
            </p>
          </div>
          <div className="space-y-1 text-right text-xs text-neutral-muted">
            <p>Function selectors</p>
            <p className="text-sm text-neutral-content">
              {supportsDiamondLoupe ? totalSelectors.toLocaleString("en-US") : "n/a"}
            </p>
          </div>
          <div className="space-y-1 text-right text-xs text-neutral-muted">
            <p>Inferred proxy ABI</p>
            <select
              className="rounded-lg border border-border-neutral bg-neutral px-2 py-1 text-sm text-neutral-content focus:border-primary-content focus:outline-none focus:ring-1 focus:ring-primary-content"
              value={selectedProxyAbiLabel !== "" ? selectedProxyAbiLabel : (inferredProxyAbi?.label ?? "")}
              onChange={(event) =>
                setSelectedProxyAbiLabel(event.target.value)
              }
            >
              {!inferredProxyAbi?.label && (
                <option value="">Unknown</option>
              )}
              {KNOWN_ABI_CATALOG.map(({ label }) => (
                <option key={label} value={label}>
                  {label}
                  {label === inferredProxyAbi?.label ? " (inferred)" : ""}
                </option>
              ))}
            </select>
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

              {diamondAddress &&
                !supportsDiamondLoupe &&
                !isFetching &&
                !loupeReadFailed && (
                <InfoBox
                  infoBoxType="warning"
                  title="No facets returned"
                  content="The diamond returned an empty facet array."
                />
              )}

              {facetsWithNames.length > 0 && (
                <div className="space-y-3">
                  {facetsWithNames.map((facet, index) => (
                    <div
                      key={facet.facetAddress}
                      className="rounded-xl border border-border-neutral/40 bg-neutral/50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-neutral-content">
                            {facet.inferredName ?? `Unidentified Facet #${index + 1}`}
                          </p>
                          <p className="font-mono text-xs text-neutral-muted">
                            (
                            {getExplorerAddressHref(facet.facetAddress) ?
                              <a
                                href={getExplorerAddressHref(facet.facetAddress) ?? undefined}
                                target="_blank"
                                rel="noreferrer"
                                className="underline decoration-border-neutral/60 underline-offset-2 transition hover:text-neutral-content"
                              >
                                {facet.facetAddress}
                              </a>
                            : facet.facetAddress}
                            )
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
                              onClick={() =>
                                handleFunctionSelect(
                                  selector,
                                  (signatureMap[selector] ?? [])[0],
                                )
                              }
                            >
                              {(signatureMap[selector] ?? [])[0] ?
                                <>
                                  <div className="text-sm font-mono text-primary-content">
                                    {(signatureMap[selector] ?? [])[0]}
                                  </div>
                                  <div className="mt-1 font-mono text-xs text-neutral-content">
                                    {selector}
                                  </div>
                                </>
                              : <>
                                  <div className="h-4 w-48 rounded bg-primary-content/15" />
                                  <div className="mt-1 font-mono text-xs text-neutral-content">
                                    {selector}
                                  </div>
                                </>
                              }
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

              {diamondAddress && proxyFunctions.length > 0 && (
                <div className="rounded-xl border border-border-neutral/40 bg-neutral/50 p-4 space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-neutral-content">
                      Proxy / main ABI surface
                    </p>
                    <p className="text-xs text-neutral-muted">
                      Accessible fields and functions from the inferred main contract ABI, not only loupe facets.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    {proxyFunctions.map((fn) => {
                      const signature = toCanonicalSignature(fn);
                      const selector = selectorFromSignature(signature);

                      return (
                        <button
                          key={signature}
                          type="button"
                          className={`rounded border px-2 py-1 text-left ${
                            selectedSignature === signature ?
                              "border-primary-content/80 bg-primary-content/10 text-primary-content"
                            : "border-border-neutral/50 bg-neutral/30 text-primary-content"
                          }`}
                          onClick={() =>
                            handleFunctionSelect(selector, signature)
                          }
                        >
                          <div className="font-mono text-sm text-primary-content">
                            {signature}
                          </div>
                          <div className="mt-1 font-mono text-xs text-neutral-content">
                            {selector}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-neutral-muted">
                            <span>proxy/main</span>
                            <span>{fn.stateMutability}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {diamondAddress &&
                (availableSelectors.length > 0 || selectedSignature.trim()) && (
                <div
                  ref={functionRunnerRef}
                  className="rounded-xl border border-border-neutral/40 bg-neutral/50 p-4 space-y-4"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-neutral-content">
                      Facet function runner
                    </p>
                    <p className="text-xs text-neutral-muted">
                      Resolve selectors and execute any function using manual
                      args. In proxy mode, only inferred proxy/main ABI
                      functions are available.
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

                  <label className="flex flex-col gap-1 text-xs text-neutral-muted">
                    <span>Manual signature override</span>
                    <input
                      className="rounded-lg border border-border-neutral bg-neutral px-3 py-2 text-sm text-neutral-content placeholder:text-neutral-muted focus:border-primary-content focus:outline-none focus:ring-1 focus:ring-primary-content"
                      value={selectedSignature}
                      onChange={(event) => {
                        setIsManualSignatureOverride(true);
                        setSelectedSelector("");
                        setSelectedSignature(event.target.value);
                      }}
                      placeholder="e.g. getCommunityFee()"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs text-neutral-muted">
                    <span>Arguments (JSON array)</span>
                    <textarea
                      className="min-h-[88px] rounded-lg border border-border-neutral bg-neutral px-3 py-2 font-mono text-xs text-neutral-content placeholder:text-neutral-muted focus:border-primary-content focus:outline-none focus:ring-1 focus:ring-primary-content"
                      value={argsInput}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setArgsInput(nextValue);
                        try {
                          const maybeArgs = JSON.parse(nextValue || "[]");
                          if (Array.isArray(maybeArgs) && selectedAbiFunction) {
                            setArgFieldValues(
                              (selectedAbiFunction.inputs ?? []).map(
                                (input, index) =>
                                  stringifyFieldValue(
                                    maybeArgs[index] ??
                                      (input.type === "bool" ? false : ""),
                                  ),
                              ),
                            );
                          }
                        } catch {
                          // keep manual JSON free-form if invalid
                        }
                      }}
                      placeholder='Example: ["0xabc...", "1000000000000000000"]'
                    />
                  </label>

                  {generatedArgFields.length > 0 && (
                    <div className="space-y-3 rounded-xl border border-border-neutral/40 bg-neutral/30 p-4">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-neutral-content">
                          Generated argument fields
                        </p>
                        <p className="text-xs text-neutral-muted">
                          Inputs are inferred from the selected function signature and keep the JSON args array in sync.
                        </p>
                      </div>
                      <div className="grid gap-3">
                        {generatedArgFields.map((field) => (
                          <GeneratedArgFieldEditor
                            key={field.key}
                            field={field}
                            onChange={(path, value) => {
                              const nextValues = setNestedPathValue(
                                argFieldValues,
                                path,
                                value,
                              );
                              setArgFieldValues(nextValues);
                              syncArgTextareaFromFields(
                                nextValues,
                                selectedAbiFunction,
                              );
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

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
                      color="primary"
                      className="sm:w-auto"
                      onClick={() => void executeFunction("simulate")}
                      isLoading={isSimulatingWrite}
                      disabled={
                        !diamondAddress ||
                        !selectedSignature.trim() ||
                        selectedFunctionKind === "read" ||
                        !isConnected ||
                        !walletClient?.account
                      }
                    >
                      Simulate transaction
                    </Button>
                    <Button
                      btnStyle="outline"
                      color={
                        selectedFunctionKind === "read" ? "primary" : (
                          "secondary"
                        )
                      }
                      className="sm:w-auto"
                      onClick={() => void executeFunction("read")}
                      isLoading={isExecutingRead}
                      disabled={!diamondAddress || !selectedSignature.trim()}
                    >
                      Read (eth_call)
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
                      contentStyle="whitespace-pre-wrap break-all"
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

                  {simulationOutput && (
                    <div className="space-y-1">
                      <p className="text-xs text-neutral-muted">
                        Simulation result
                      </p>
                      <pre className="overflow-auto rounded-lg border border-border-neutral/50 bg-neutral/30 p-3 text-xs text-neutral-content">
                        {simulationOutput}
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
