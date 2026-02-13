import { useEffect, useState } from "react";
import {
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ClockIcon,
  ArchiveBoxIcon,
  InformationCircleIcon,
  ArrowPathRoundedSquareIcon,
  ChevronDoubleUpIcon,
  LinkIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";
import {
  NoSymbolIcon,
  StopIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/solid";
import sfMeta from "@superfluid-finance/metadata";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Address, zeroAddress } from "viem";
import {
  ArbitrableConfig,
  getPassportStrategyDocument,
  getPassportStrategyQuery,
  getPoolDataQuery,
} from "#/subgraph/.graphclient";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Divider } from "./Diivider";
import { EthAddress } from "./EthAddress";
import { ExpandableComponent } from "./Expandable";
import PoolEditForm from "./Forms/PoolEditForm";
import { InfoBox } from "./InfoBox";
import MarkdownWrapper from "./MarkdownWrapper";
import { Modal } from "./Modal";
import { Skeleton } from "./Skeleton";
import { Statistic } from "./Statistic";
import { SuperfluidStream } from "@/assets";
import { TransactionStatusNotification } from "@/components/TransactionStatusNotification";
import { chainConfigMap } from "@/configs/chains";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { VOTING_POINT_SYSTEM_DESCRIPTION } from "@/globals";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useCouncil } from "@/hooks/useCouncil";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { MetadataV1 } from "@/hooks/useIpfsFetch";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";

import { SuperToken } from "@/hooks/useSuperfluidToken";
import { superTokenFactoryAbi } from "@/src/customAbis";
import { cvStrategyABI, registryCommunityABI } from "@/src/generated";
import {
  PointSystems,
  PoolTypes,
  ProposalStatus,
  SybilResistanceType,
} from "@/types";
import { getEventFromReceipt } from "@/utils/contracts";
import { delayAsync } from "@/utils/delayAsync";
import {
  convertSecondsToReadableTime,
  CV_PASSPORT_THRESHOLD_SCALE,
  CV_SCALE_PRECISION,
  formatTokenAmount,
  MAX_RATIO_CONSTANT,
  roundToSignificant,
} from "@/utils/numbers";
import { shortenAddress } from "@/utils/text";

type Props = {
  ipfsResult: MetadataV1 | null;
  poolId: number;
  isEnabled: boolean;
  strategy: getPoolDataQuery["cvstrategies"][0];
  arbitrableConfig: Pick<
    ArbitrableConfig,
    | "defaultRuling"
    | "tribunalSafe"
    | "submitterCollateralAmount"
    | "challengerCollateralAmount"
    | "defaultRulingTimeout"
  >;
  poolToken?: {
    address: Address;
    symbol: string;
    decimals: number;
    balance: bigint;
    name?: string;
  };
  maxAmount: number;
  superToken:
    | {
        value: bigint;
        symbol: string;
        decimals: number;
        address: Address;
        sameAsUnderlying?: boolean;
      }
    | undefined;
  superTokenCandidate: SuperToken | null;
  setSuperTokenCandidate: (token: SuperToken | null) => void;
  minThGtTotalEffPoints: boolean;
  communityName: string;
};

export function calculateConvictionGrowthInSeconds(
  decay: number,
  blockTime: number,
): number {
  const scaledDecay = decay / Math.pow(10, 7);

  const halfLifeInSeconds = blockTime / Math.log2(1 / scaledDecay);

  return halfLifeInSeconds;
}

export function calculateMinimumConviction(
  weight: number,
  spendingLimit: number,
) {
  const weightNum = Number(weight) / CV_SCALE_PRECISION;

  const spendingLimitFraction = spendingLimit / 100;
  const maxRatioNum = spendingLimitFraction / MAX_RATIO_CONSTANT;

  let minimumConviction = weightNum / maxRatioNum ** 2;

  minimumConviction = minimumConviction * 100;

  return minimumConviction;
}
export default function PoolHeader({
  ipfsResult,
  poolId,
  isEnabled,
  strategy,
  arbitrableConfig,
  poolToken,
  maxAmount,
  superToken,
  superTokenCandidate,
  setSuperTokenCandidate,
  minThGtTotalEffPoints,
  communityName,
}: Props) {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const { publish } = usePubSubContext();
  const { id: chainId, safePrefix } = useChainFromPath()!;
  const router = useRouter();
  const path = usePathname();
  const isArchived = strategy.archived;
  const [superTokenCopied, setSuperTokenCopied] = useState(false);
  const [isEnableStreamTxModalOpened, setIsEnableStreamTxModalOpened] =
    useState(false);
  const [isShareDropdownLocked, setIsShareDropdownLocked] = useState(false);
  const [toastId, setToastId] = useState<ReturnType<typeof toast>>();

  const { data: passportStrategyData } =
    useSubgraphQuery<getPassportStrategyQuery>({
      query: getPassportStrategyDocument,
      variables: { strategyId: strategy.id.toLowerCase() as Address },
      changeScope: {
        topic: "pool",
        type: "update",
        id: strategy.poolId,
        chainId: chainId,
      },
    });
  const pointSystemType = Number(strategy.config.pointSystem);
  const passportStrategy = passportStrategyData?.passportStrategy;
  const passportScore =
    passportStrategy?.threshold ?
      Number(passportStrategy?.threshold) / CV_PASSPORT_THRESHOLD_SCALE
    : null;
  const blockTime = chainConfigMap[chainId!].blockTime;
  const spendingLimitPct =
    (Number(strategy.config.maxRatio || 0) / CV_SCALE_PRECISION) * 100;

  const { isCouncilSafe, isCouncilMember } = useCouncil({
    strategyOrCommunity: strategy,
    detectCouncilMember: true,
  });

  const minimumConviction = calculateMinimumConviction(
    strategy.config.weight,
    spendingLimitPct * MAX_RATIO_CONSTANT,
  );

  const convictionGrowthSec = calculateConvictionGrowthInSeconds(
    strategy.config.decay,
    blockTime,
  );

  //problem here, we are passing decimals from pool token decimals but it it decimals from the GOV token
  const communityGovTokenDecimals =
    strategy?.registryCommunity?.garden?.decimals;

  const minThresholdPoints =
    poolToken ?
      formatTokenAmount(
        strategy.config.minThresholdPoints,
        +communityGovTokenDecimals,
      )
    : "0";

  const maxVotingWeight =
    poolToken ? formatTokenAmount(maxAmount, poolToken.decimals) : 0;

  const spendingLimit =
    (strategy.config.maxRatio / CV_SCALE_PRECISION) *
    (1 - Math.sqrt(minimumConviction / 100)) *
    100;

  const communityAddr = strategy.registryCommunity.id as Address;
  const defaultResolution = arbitrableConfig.defaultRuling;
  const proposalCollateral = arbitrableConfig.submitterCollateralAmount;
  const disputeCollateral = arbitrableConfig.challengerCollateralAmount;
  const tribunalAddress = arbitrableConfig.tribunalSafe;
  const proposalType = strategy.config.proposalType;
  const pointSystem = strategy.config.pointSystem;
  const allowList = strategy.config.allowlist;
  const rulingTime = arbitrableConfig.defaultRulingTimeout;

  const proposalOnDispute = strategy.proposals?.some(
    (proposal) => ProposalStatus[proposal.proposalStatus] === "disputed",
  );

  const { value, unit } = convertSecondsToReadableTime(convictionGrowthSec);

  let sybilResistanceType: SybilResistanceType = "noSybilResist";
  let sybilResistanceValue: Address[] | number | undefined;
  if (strategy.sybil != null) {
    if (strategy.sybil.type === "Passport" && passportScore != null) {
      sybilResistanceType = "gitcoinPassport";
      sybilResistanceValue = passportScore;
    } else if (strategy.sybil.type === "GoodDollar") {
      sybilResistanceType = "goodDollar";
      sybilResistanceValue = undefined;
    }
  } else if (
    allowList &&
    !(allowList.length > 0 && allowList[0] === zeroAddress)
  ) {
    sybilResistanceType = "allowList";
    sybilResistanceValue = allowList as Address[] | undefined;
  }

  const sybilResistanceLabel: Record<SybilResistanceType, string> = {
    allowList: "Members in Allowlist",
    gitcoinPassport: "Gitcoin Passport verified members",
    goodDollar: "GoodDollar verified members",
    noSybilResist: "All community members",
  };

  const sybilResistanceInfo: Record<SybilResistanceType, string> = {
    allowList: "Only users in the allowlist can interact with this pool",
    gitcoinPassport:
      typeof sybilResistanceValue === "number" ?
        `Only users with a Gitcoin Passport above the threshold can interact with this pool: \n Threshold: ${sybilResistanceValue.toFixed(2)}`
      : "",
    goodDollar:
      "Only users verified with GoodDollar Sybil-Resistance can interact with this pool.",
    noSybilResist: "Any wallet can interact with this pool.",
  };

  const poolConfig = [
    {
      label: "Spending limit",
      value: `${spendingLimit > 99 ? "100" : roundToSignificant(spendingLimit, 2)} %`,
      info: "Max percentage of the pool funds that can be spent in a single proposal.",
    },
    {
      label: "Min conviction",
      value: `${roundToSignificant(minimumConviction, 2, { showPrecisionMissIndicator: false })} %`,
      info: "% of Pool's voting weight needed to pass the smallest funding proposal possible. Higher funding requests demand greater conviction to pass.",
    },
    {
      label: "Conviction growth",
      value:
        `${value} ${unit}` +
        (value > 1 && !unit.includes("sec") && !unit.includes("min") ?
          "s"
        : ""),
      info: "It's the time for conviction to reach proposal support. This parameter is logarithmic, represented as a half life and may vary slightly over time depending on network block times.",
    },
    {
      label: "Min threshold",
      value: `${minThresholdPoints}`,
      info: "A fixed amount of Voting Power that overrides minimum conviction when not enough members have activated their governance.",
    },
    {
      label: "Max voting weight",
      value: `${maxVotingWeight} ${poolToken?.symbol}`,
      info: "Staking above this specified limit won’t increase your voting weight.",
    },
    {
      label: "Who can vote?",
      info: sybilResistanceInfo[sybilResistanceType],
      value:
        sybilResistanceType === "allowList" ?
          <div className="dropdown dropdown-hover dropdown-center dropdowm-bottom sm:dropdown-right">
            {/* Trigger for the dropdown */}
            <div className="flex items-center gap-2 group">
              <p className="subtitle ml-1">Allowlist</p>
              <ChevronDoubleUpIcon className="w-4 h-4 group-hover:rotate-180 transition-all ease-in-out duration-250" />
            </div>
            <div className="dropdown-content bg-primary rounded-box shadow z-10 p-2 max-h-[500px] overflow-y-auto w-64">
              <ul className="menu w-full gap-1">
                {(allowList ?? []).length > 0 ?
                  (allowList ?? []).map((addr) => (
                    <li key={addr} className="flex flex-col gap-2">
                      <EthAddress
                        address={addr as Address}
                        shortenAddress={true}
                        icon={"ens"}
                        actions="copy"
                      />
                    </li>
                  ))
                : <li>
                    <span>No addresses</span>
                  </li>
                }
              </ul>
            </div>
          </div>
        : sybilResistanceLabel[sybilResistanceType],
    },

    {
      label: "Token",
      info: "The token used in this pool to fund proposals.",
      value: (
        <div className="flex items-center">
          <EthAddress
            address={poolToken?.address as Address}
            shortenAddress={true}
            icon={false}
            actions="none"
            label={poolToken?.symbol}
          />
          {superToken && (
            <div
              className="tooltip"
              data-tip={`${PoolTypes[proposalType] === "streaming" ? "Streaming" : "Stream funding"} enabled on this pool. \nYou can stream ${superToken.symbol} tokens to this pool. Click to copy address.`}
            >
              <button
                className="btn btn-ghost btn-xs p-0"
                onClick={async () => {
                  setSuperTokenCopied(true);
                  navigator.clipboard.writeText(superToken.address!);
                  await delayAsync(1000);
                  setSuperTokenCopied(false);
                }}
              >
                {superTokenCopied ?
                  <div className="w-8 h-8 p-2">
                    <CheckIcon className="w-4 h-4" />
                  </div>
                : <Image
                    src={SuperfluidStream}
                    alt="Incoming Stream"
                    width={32}
                    height={32}
                  />
                }
              </button>
            </div>
          )}
        </div>
      ),
    },
  ] as const;

  const filteredPoolConfig =
    (
      PoolTypes[proposalType] === "signaling" &&
      PointSystems[pointSystem] !== "capped"
    ) ?
      poolConfig.filter((config) => {
        const filter: (typeof poolConfig)[number]["label"][] = [
          "Spending limit",
          "Min threshold",
          "Min conviction",
          "Max voting weight",
          "Token",
        ];
        return config.value != null && !filter.includes(config.label);
      })
    : PoolTypes[proposalType] === "signaling" ?
      poolConfig.filter((config) => {
        const filteredLabels: (typeof poolConfig)[number]["label"][] = [
          "Spending limit",
          "Min threshold",
          "Min conviction",
        ];
        return config.value != null && !filteredLabels.includes(config.label);
      })
    : PointSystems[pointSystem] === "capped" ? poolConfig
    : poolConfig.filter((config) => config.label !== "Max voting weight");

  const { write: rejectPoolWrite } = useContractWriteWithConfirmations({
    address: communityAddr,
    abi: registryCommunityABI,
    contractName: "Registry Community",
    functionName: "rejectPool",
    fallbackErrorMessage: "Error rejecting pool, please report a bug.",
    args: [strategy.id as Address],
    onConfirmations: () => {
      publish({
        topic: "pool",
        function: "rejectPool",
        type: "update",
        containerId: communityAddr,
        chainId: chainId,
      });
      const pathSegments = path.split("/");
      pathSegments.pop();
      if (pathSegments.length === 6) {
        pathSegments.pop();
      }
      const newPath = pathSegments.join("/");
      router.push(newPath);
    },
  });

  const { write: addStrategyByPoolId } = useContractWriteWithConfirmations({
    address: communityAddr,
    abi: registryCommunityABI,
    contractName: "Registry Community",
    functionName: "addStrategyByPoolId",
    fallbackErrorMessage: "Error approving pool, please report a bug.",
    args: [BigInt(poolId)],
    onConfirmations: () => {
      publish({
        topic: "pool",
        function: "addStrategyByPoolId",
        type: "update",
        containerId: communityAddr,
        chainId: chainId,
      });
    },
  });

  const { write: removeStrategyByPoolId } = useContractWriteWithConfirmations({
    address: communityAddr,
    abi: registryCommunityABI,
    contractName: "Registry Community",
    functionName: "removeStrategyByPoolId",
    fallbackErrorMessage: "Error disabling pool, please report a bug.",
    args: [BigInt(poolId)],
    onConfirmations: () => {
      publish({
        topic: "pool",
        function: "removeStrategyByPoolId",
        type: "update",
        containerId: communityAddr,
        chainId: chainId,
      });
    },
  });

  const {
    write: writeEnableStreamFunding,
    isLoading: isEnableStreamFundingLoading,
  } = useContractWriteWithConfirmations({
    address: strategy.id as Address,
    contractName: "CV Strategy",
    functionName: "setPoolParams",
    fallbackErrorMessage: "Error enabling stream funding. Please report it.",
    onConfirmations: () => {
      publish({
        topic: "pool",
        function: "setPoolParams",
        type: "update",
        id: strategy.poolId,
        chainId: chainId,
      });
    },
    abi: cvStrategyABI,
  });

  const emptySetPoolParamsCore = [
    {
      arbitrator: zeroAddress,
      tribunalSafe: zeroAddress,
      submitterCollateralAmount: 0n,
      challengerCollateralAmount: 0n,
      defaultRuling: 0n,
      defaultRulingTimeout: 0n,
    },
    {
      maxRatio: 0n,
      weight: 0n,
      decay: 0n,
      minThresholdPoints: 0n,
    },
    0n,
    [],
    [],
  ] as const;

  const networkSfMetadata =
    chainId ? sfMeta.getNetworkByChainId(chainId) : undefined;

  useEffect(() => {
    if (
      isEnableStreamTxModalOpened &&
      isCouncilSafe &&
      toastId != null &&
      superTokenCandidate
    ) {
      toast.dismiss(toastId);
      setToastId(undefined);
      writeEnableStreamFunding({
        args: [...emptySetPoolParamsCore, superTokenCandidate.id],
      });
    }
  }, [isCouncilSafe, superTokenCandidate]);

  const {
    writeAsync: writeCreateSuperTokenAsync,
    isLoading: isCreateSuperTokenLoading,
  } = useContractWriteWithConfirmations({
    abi: superTokenFactoryAbi,
    address: networkSfMetadata?.contractsV1.superTokenFactory as Address,
    functionName: "createERC20Wrapper",
    contractName: "SuperTokenFactory",
    onConfirmations: async (receipt) => {
      const newSuperToken = getEventFromReceipt(
        receipt,
        "SuperTokenFactory",
        "SuperTokenCreated",
      ).args;
      setSuperTokenCandidate({
        name: "Super" + poolToken!.name,
        symbol: poolToken!.symbol + "x",
        id: newSuperToken.token,
        underlyingToken: poolToken!.address,
      });
      if (!isCouncilSafe) {
        setToastId(
          toast(
            <TransactionStatusNotification
              status="waiting"
              message={`Connect with Council Safe to continue (${shortenAddress(strategy.registryCommunity.councilSafe!)})`}
            />,
            {
              autoClose: false,
              closeOnClick: false,
              className: isCouncilSafe ? "!cursor-pointer" : "",
              onClick: async () => {
                if (!isCouncilSafe) return;
                toast.dismiss(toastId);
                setToastId(undefined);
                writeEnableStreamFunding({
                  args: [
                    ...emptySetPoolParamsCore,
                    newSuperToken.token as Address,
                  ],
                });
              },
            },
          ),
        );
      } else {
        writeEnableStreamFunding({
          args: [...emptySetPoolParamsCore, newSuperToken.token as Address],
        });
      }
    },
  });

  //Disable Council Safe Buttons: Edit, Disable and Approve
  const disableCouncilSafeBtnCondition: ConditionObject[] = [
    {
      condition: !isCouncilSafe,
      message: "Connect with Council safe",
    },
  ];

  const disableCouncilSafeButtons = disableCouncilSafeBtnCondition.some(
    (cond) => cond.condition,
  );

  const { tooltipMessage, missmatchUrl, isConnected } = useDisableButtons(
    disableCouncilSafeBtnCondition,
  );

  const handleEnableStreamFunding = () => {
    let superTokenAddress = superTokenCandidate?.id;
    if (!superTokenAddress) {
      if (!poolToken) {
        console.error("Pool token is required to create a super token.");
        toast.error(
          "Pool token is required to create a super token. Please contact the Gardens team.",
        );
        return;
      }
      setIsEnableStreamTxModalOpened(true);
      writeCreateSuperTokenAsync({
        args: [
          poolToken!.address as Address,
          1,
          "Super " + poolToken!.name,
          poolToken!.symbol + "x",
        ],
      });
    } else {
      writeEnableStreamFunding({
        args: [...emptySetPoolParamsCore, superTokenAddress ?? zeroAddress],
      });
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Pool link copied to clipboard!");
    setIsShareDropdownLocked(true);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleShareOnX = () => {
    const poolName = ipfsResult?.title ?? "This pool";

    const pooltype = PoolTypes[proposalType];
    const text =
      "Check out " + poolName + ", a " + pooltype + " pool on " + communityName;
    const url = window.location.href;
    const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(xUrl, "_blank", "noopener,noreferrer");
    setIsShareDropdownLocked(true);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  return (
    <>
      <div
        className={`col-span-12 space-y-6 max-h-fit ${
          isEnabled ? "xl:col-span-9" : "xl:col-span-12"
        }`}
      >
        <section className="section-layout flex flex-col g-6">
          {/* Title - Badge poolType - Addresses and Buttons -> (when council memeber is connected) */}
          <header className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center flex-wrap gap-4">
              <h2>
                <Skeleton isLoading={!ipfsResult} className="sm:!w-96 h-8">
                  {ipfsResult?.title}
                </Skeleton>
              </h2>
              <div className="flex items-center gap-2">
                <Badge type={parseInt(proposalType)} />
              </div>
            </div>

            {/* Pool Description */}
            <ExpandableComponent
              defaultExpanded={false}
              title="Pool Description"
              previewHeight={161}
              withDescription
            >
              <Skeleton rows={5} isLoading={!ipfsResult}>
                <MarkdownWrapper source={ipfsResult?.description ?? ""} />
              </Skeleton>
            </ExpandableComponent>

            {/* Separetor */}
            <Divider />

            <div className="flex flex-col gap-4">
              {/* Addresses */}
              <div className="flex flex-col sm:flex-row items-baseline justify-between">
                <EthAddress
                  icon={false}
                  address={strategy.id as Address}
                  label="Pool Address:"
                  textColor="var(--color-grey-800)"
                />
                <div className="flex">
                  <a
                    href={`https://app.safe.global/transactions/queue?safe=${safePrefix}:${strategy.registryCommunity.councilSafe}`}
                    className="whitespace-nowrap flex flex-nowrap gap-1 items-center"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Council Safe:
                    <ArrowTopRightOnSquareIcon width={16} height={16} />:
                  </a>
                  <EthAddress
                    address={strategy.registryCommunity.councilSafe as Address}
                    shortenAddress={true}
                    actions="copy"
                    icon={false}
                    textColor="var(--color-grey-800)"
                  />
                </div>
                <div className="flex">
                  <a
                    href={`https://app.safe.global/transactions/queue?safe=${safePrefix}:${tribunalAddress}`}
                    className="whitespace-nowrap flex flex-nowrap gap-1 items-center"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Tribunal Safe:
                    <ArrowTopRightOnSquareIcon width={16} height={16} />:
                  </a>
                  <EthAddress
                    address={tribunalAddress as Address}
                    shortenAddress={true}
                    actions="copy"
                    icon={false}
                    textColor="var(--color-grey-800)"
                  />
                </div>
              </div>

              <Divider />

              {/* Buttons: disable - edit - archive - create steam token  */}
              <div className="flex flex-col sm:flex-row justify-between items-baseline flex-wrap gap-2">
                {(!!isCouncilMember || isCouncilSafe) && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap w-full sm:w-auto mt-2">
                    {isArchived ?
                      <Button
                        icon={<CheckIcon height={20} width={20} />}
                        disabled={
                          !isConnected ||
                          missmatchUrl ||
                          disableCouncilSafeButtons
                        }
                        tooltip={
                          tooltipMessage ??
                          "Restore the pool will also enable it."
                        }
                        forceShowTooltip={true}
                        onClick={() => addStrategyByPoolId()}
                      >
                        Restore
                      </Button>
                    : isEnabled ?
                      <>
                        <Button
                          icon={<StopIcon height={20} width={20} />}
                          disabled={
                            !isConnected ||
                            missmatchUrl ||
                            disableCouncilSafeButtons
                          }
                          tooltip={
                            tooltipMessage ??
                            "Disable pool will pause all interactions with this pool. It is possible to enable it back."
                          }
                          forceShowTooltip={true}
                          onClick={() => removeStrategyByPoolId()}
                          btnStyle="outline"
                          color="secondary"
                          // className="!w-full sm:!w-auto"
                        >
                          Disable
                        </Button>
                        <Button
                          icon={<ArchiveBoxIcon height={20} width={20} />}
                          disabled={
                            !isConnected ||
                            missmatchUrl ||
                            disableCouncilSafeButtons
                          }
                          tooltip={
                            tooltipMessage ??
                            "Archive pool will remove it from the list of pools. Need to contact the Gardens team to restore it."
                          }
                          forceShowTooltip={true}
                          onClick={() => rejectPoolWrite()}
                          btnStyle="outline"
                          color="danger"
                        >
                          Archive
                        </Button>
                      </>
                    : <>
                        <Button
                          icon={<CheckIcon height={20} width={20} />}
                          disabled={
                            !isConnected ||
                            missmatchUrl ||
                            disableCouncilSafeButtons
                          }
                          tooltip={
                            tooltipMessage ?? "Approve pool to enable it."
                          }
                          forceShowTooltip={true}
                          onClick={() => addStrategyByPoolId()}
                        >
                          Approve
                        </Button>
                        <Button
                          icon={<NoSymbolIcon height={20} width={20} />}
                          disabled={
                            !isConnected ||
                            missmatchUrl ||
                            disableCouncilSafeButtons
                          }
                          tooltip={
                            tooltipMessage ??
                            "Reject pool will remove it from the list. \nNeed to contact the Gardens team to\n restore it."
                          }
                          forceShowTooltip={true}
                          onClick={() => rejectPoolWrite()}
                          btnStyle="outline"
                          color="danger"
                        >
                          Reject
                        </Button>
                      </>
                    }
                    <Button
                      btnStyle="outline"
                      icon={<Cog6ToothIcon height={20} width={20} />}
                      disabled={
                        !isConnected ||
                        missmatchUrl ||
                        disableCouncilSafeButtons
                      }
                      tooltip={tooltipMessage}
                      onClick={() => setIsOpenModal(true)}
                    >
                      Edit
                    </Button>
                    {!superToken &&
                      PoolTypes[proposalType] !== "signaling" &&
                      networkSfMetadata?.contractsV1.superTokenFactory && (
                        <>
                          <Button
                            btnStyle="outline"
                            color="tertiary"
                            icon={
                              <ArrowPathRoundedSquareIcon
                                height={20}
                                width={20}
                              />
                            }
                            disabled={
                              !isConnected ||
                              missmatchUrl ||
                              !!(isCouncilMember && superTokenCandidate)
                            }
                            tooltip={
                              (isCouncilMember &&
                                superTokenCandidate &&
                                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                                tooltipMessage) ||
                              "This allows people to add funds to the pool via streaming (Superfluid)."
                            }
                            forceShowTooltip={true}
                            onClick={() => handleEnableStreamFunding()}
                            isLoading={
                              isEnableStreamFundingLoading ||
                              isCreateSuperTokenLoading
                            }
                          >
                            {superTokenCandidate ?
                              "Enable Streaming"
                            : "Create Stream Token"}
                          </Button>
                        </>
                      )}
                  </div>
                )}

                <Divider className="sm:hidden" />
                {/* Share button dropdown */}
                <div
                  className={`z-[9999] ${!!isCouncilMember || isCouncilSafe ? "w-full sm:w-fit" : "w-full flex justify-end"}`}
                >
                  <div
                    className=" z-[9999] dropdown dropdown-hover dropdown-start w-full sm:w-auto"
                    onMouseLeave={() => setIsShareDropdownLocked(false)}
                  >
                    <Button
                      type="button"
                      btnStyle="outline"
                      color="primary"
                      icon={<ShareIcon className="w-5 h-5" />}
                      className="!w-full"
                      onClick={() => setIsShareDropdownLocked(true)}
                    >
                      Share
                    </Button>

                    <ul
                      className={`dropdown-content dropdown-close menu bg-primary rounded-box w-full  sm:w-[200px] p-2 shadow fixed z-[9999] left-0 top-full ${isShareDropdownLocked ? "!invisible !opacity-0 !pointer-events-none" : ""}`}
                    >
                      <li>
                        <Button
                          type="button"
                          btnStyle="ghost"
                          color="primary"
                          icon={<LinkIcon className="w-5 h-5" />}
                          className="w-full mt-1 xl:!justify-start"
                          onClick={handleCopyLink}
                        >
                          Copy Link
                        </Button>
                      </li>
                      <li>
                        <Button
                          type="button"
                          btnStyle="ghost"
                          color="primary"
                          icon={<XIcon className="w-5 h-5" />}
                          className="w-full mt-1 xl:!justify-start z-50"
                          onClick={handleShareOnX}
                        >
                          Share on X
                        </Button>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <Modal
              title={`Edit ${ipfsResult?.title} #${poolId}`}
              isOpen={isOpenModal}
              onClose={() => setIsOpenModal(false)}
            >
              {(!!poolToken || PoolTypes[proposalType] !== "funding") && (
                <PoolEditForm
                  strategy={strategy}
                  pointSystemType={pointSystemType}
                  token={poolToken}
                  proposalType={proposalType}
                  proposalOnDispute={proposalOnDispute}
                  initValues={{
                    sybilResistanceValue: sybilResistanceValue,
                    sybilResistanceType: sybilResistanceType,
                    spendingLimit: spendingLimit.toFixed(2),
                    minimumConviction: minimumConviction.toFixed(2),
                    convictionGrowth: convictionGrowthSec.toFixed(4),
                    minThresholdPoints: minThresholdPoints,
                    defaultResolution: defaultResolution,
                    proposalCollateral: proposalCollateral,
                    disputeCollateral: disputeCollateral,
                    tribunalAddress: tribunalAddress,
                    rulingTime,
                  }}
                  setModalOpen={setIsOpenModal}
                />
              )}
            </Modal>
          </header>

          {/* InfoBox - Banner when pool is not-enabled or Archived */}
          {minThGtTotalEffPoints && isEnabled && (
            <InfoBox
              title="Min threshold"
              infoBoxType="warning"
              content="Not enough eligible members in this pool have activated their governance. No proposals will pass until more members do. You can still create and support proposals."
              className="mb-4"
            />
          )}
          {!isEnabled && (
            <div className="banner">
              {isArchived ?
                <ArchiveBoxIcon className="h-8 w-8 text-secondary-content" />
              : <ClockIcon className="h-8 w-8 text-secondary-content" />}
              <h6>
                {isArchived ?
                  "This pool has been archived"
                : "Waiting for council approval"}
              </h6>
            </div>
          )}
        </section>

        {/* Pool Settings */}
        <ExpandableComponent title="Pool Settings" withLayout>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredPoolConfig.map((config) => (
              <div
                key={config.label}
                className="flex items-center justify-between gap-4 bg-primary p-3 rounded-xl "
              >
                <Statistic
                  label={config.label}
                  icon={
                    <InformationCircleIcon
                      className="stroke-2 text-primary-content"
                      width={22}
                      height={22}
                    />
                  }
                  tooltip={config.info}
                  className="w-full"
                >
                  <p className="subtitle">{config.value}</p>
                </Statistic>
              </div>
            ))}
          </div>
        </ExpandableComponent>
      </div>
    </>
  );
}

const XIcon = ({ ...props }: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M13.6823 10.6218L20.2391 3H18.6854L12.9921 9.61788L8.44486 3H3.2002L10.0765 13.0074L3.2002 21H4.75404L10.7663 14.0113L15.5685 21H20.8131L13.6819 10.6218H13.6823ZM11.5541 13.0956L10.8574 12.0991L5.31391 4.16971H7.70053L12.1742 10.5689L12.8709 11.5655L18.6861 19.8835H16.2995L11.5541 13.096V13.0956Z" />
    </svg>
  );
};

// information box remove ort change - bg in dark
