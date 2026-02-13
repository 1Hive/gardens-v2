"use client";
import React, { ReactElement, useEffect, useState } from "react";
import { contractEnv, IdentitySDK } from "@goodsdks/citizen-sdk";
import { toast } from "react-toastify";
import { Address } from "viem";
import { celo } from "viem/chains";
import {
  useAccount,
  useContractRead,
  usePublicClient,
  useSwitchNetwork,
  useWalletClient,
} from "wagmi";
import {
  CVStrategy,
  getGoodDollarStrategyDocument,
  getGoodDollarStrategyQuery,
  getPassportStrategyDocument,
  getPassportStrategyQuery,
  getPassportUserDocument,
  getPassportUserQuery,
} from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { LoadingSpinner } from "./LoadingSpinner";
import { Skeleton } from "./Skeleton";
import { Modal } from "@/components";
import { isProd } from "@/configs/isProd";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useGoodDollarSdk } from "@/hooks/useGoodDollar";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { goodDollarABI } from "@/src/generated";
import { CV_PASSPORT_THRESHOLD_SCALE } from "@/utils/numbers";

type SubmitPassportResponse = {
  data: any;
  error: boolean;
};

type CheckPassportProps = {
  strategy: Pick<CVStrategy, "id" | "sybil" | "poolId">;
  children: ReactElement<{
    onClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  }>;
  enableCheck?: boolean;
  triggerClose?: boolean;
};

export function CheckSybil({
  strategy,
  children,
  enableCheck = true,
  triggerClose,
}: CheckPassportProps) {
  const { address: walletAddr } = useAccount();
  const [isModalOpened, setIsModalOpen] = useState(false);
  const [score, setScore] = useState<number>(0);
  const [isSubmiting, setIsSubmiting] = useState<boolean>(false);
  const { data: walletClient, refetch: refetchWalletClient } = useWalletClient({
    chainId: celo.id,
  });
  const [forceIsVerified, setForceIsVerified] = useState(false);
  const publicClient = usePublicClient({ chainId: celo.id });
  const chainFromPath = useChainFromPath();
  const { publish } = usePubSubContext();
  const { switchNetworkAsync } = useSwitchNetwork();
  const searchParams = useCollectQueryParams();
  const [isGoodDollarVerifying, setIsGoodDollarVerifying] = useState(false);
  const { isWalletVerified, refetch: refetchGoodDollar } = useGoodDollarSdk({
    enabled:
      strategy.sybil != null &&
      strategy.sybil.type === "GoodDollar" &&
      enableCheck,
  });

  const isGoodDollarCallback =
    searchParams[QUERY_PARAMS.poolPage.goodDollar] === "true";
  const isGoodDollarSuccess =
    searchParams[QUERY_PARAMS.poolPage.goodDollarVerified] === "dHJ1ZQ=="; // base64 of 'true'

  useEffect(() => {
    if (triggerClose) {
      setIsModalOpen(false);
    }
  }, [triggerClose]);

  useEffect(() => {
    if (!enableCheck) return;
    if (isModalOpened) return;
    if (!isGoodDollarCallback) return;

    setIsModalOpen(true);
  }, [enableCheck, isModalOpened, isGoodDollarCallback]);

  const { data: passportUserData, fetching: passportUserFetching } =
    useSubgraphQuery<getPassportUserQuery>({
      query: getPassportUserDocument,
      variables: { userId: walletAddr?.toLowerCase() },
      enabled:
        !!walletAddr && strategy.sybil?.type === "Passport" && enableCheck,
      changeScope: {
        topic: "member",
        id: walletAddr?.toLowerCase(),
        chainId: chainFromPath?.id,
        type: "update",
      },
    });

  const {
    data: isGoodDollarVerifiedInGardens,
    refetch: refetchGoodDollarIsVerifiedInGardens,
  } = useContractRead({
    address: chainFromPath?.goodDollar,
    abi: goodDollarABI,
    functionName: "userValidity",
    args: [walletAddr as Address],
    enabled:
      !!walletAddr && strategy.sybil?.type === "GoodDollar" && enableCheck,
  });

  const { data: passportStrategyData } =
    useSubgraphQuery<getPassportStrategyQuery>({
      query: getPassportStrategyDocument,
      variables: { strategyId: strategy.id.toLowerCase() },
      enabled: enableCheck && strategy.sybil?.type === "Passport",
      changeScope: {
        topic: "member",
        id: strategy.poolId,
        chainId: chainFromPath?.id,
        type: "update",
      },
    });

  const { data: goodDollarStrategyData } =
    useSubgraphQuery<getGoodDollarStrategyQuery>({
      query: getGoodDollarStrategyDocument,
      variables: { strategyId: strategy.id.toLowerCase() },
      enabled: enableCheck && strategy.sybil?.type === "GoodDollar",
      changeScope: {
        topic: "member",
        id: strategy.poolId,
        chainId: chainFromPath?.id,
        type: "update",
      },
    });

  const sybilStrategy =
    passportStrategyData?.passportStrategy ??
    goodDollarStrategyData?.goodDollarStrategy;
  const threshold =
    (
      sybilStrategy != null &&
      "threshold" in sybilStrategy &&
      sybilStrategy?.threshold
    ) ?
      Number(sybilStrategy?.threshold) / CV_PASSPORT_THRESHOLD_SCALE
    : 10000;

  if (!enableCheck) {
    return <>{children}</>;
  }

  //force active passport for testing
  if (!isProd) {
    (window as any).togglePassportEnable = (enable: boolean): string => {
      if (sybilStrategy) {
        sybilStrategy.active = enable;
        return "passportStrategy.active set to " + enable;
      } else {
        return "No passportStrategy found";
      }
    };
  }

  const handleCheckSybil = async (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    if (strategy.sybil?.type === "GoodDollar") {
      if (walletAddr) {
        if (isGoodDollarVerifiedInGardens) {
          console.debug("GoodDollar user is verified, moving forward...");
          setIsModalOpen(false);
        } else if (isWalletVerified) {
          console.debug(
            "Wallet is whitelisted in GoodDollar, submiting verification...",
          );
          e.preventDefault();
          e.stopPropagation();
          setIsModalOpen(true);
        } else {
          console.debug(
            "Wallet is not whitelisted in GoodDollar, opening modal...",
          );
          e.preventDefault();
          e.stopPropagation();
          setIsModalOpen(true);
        }
      }
    } else if (strategy.sybil?.type === "Passport" && sybilStrategy?.active) {
      if (walletAddr) {
        checkPassportRequirements(walletAddr, e);
      }
    } else {
      console.debug("No passport required, moving forward...");
      setIsModalOpen(false);
    }
  };

  const checkPassportRequirements = (
    _walletAddr: Address,
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    if (strategy.sybil?.type === "Passport") {
      if (passportUserData?.passportUser) {
        checkScoreRequirement(
          Number(passportUserData.passportUser.score) /
            CV_PASSPORT_THRESHOLD_SCALE,
          e,
        );
      } else {
        console.debug("No passport found, Submitting passport...");
        e.preventDefault();
        e.stopPropagation();
        submitAndWriteScorer(_walletAddr);
      }
    } else {
      console.debug("No GoodDollarUser, submiting one...");
    }
  };

  const checkScoreRequirement = (
    _score: number | string,
    e?: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    _score = Number(_score);
    if (_score >= threshold) {
      console.debug("Score meets threshold, moving forward...");
    } else {
      console.debug("Score is too low, opening modal...");
      e?.preventDefault();
      e?.stopPropagation();
      setIsModalOpen(true);
    }
  };

  const submitAndWriteScorer = async (_walletAddr: Address) => {
    setIsModalOpen(true);
    setIsSubmiting(true);
    try {
      const passportResponse = await submitPassport(_walletAddr);
      console.debug(passportResponse);
      // gitcoin passport score does not need formating
      if (passportResponse?.data?.score) {
        setScore(Number(passportResponse.data.score));
        const result = await writeSybil(_walletAddr);
        if (result.error) {
          const message = JSON.parse(result.errorMessage).error;
          console.error("Error writing scorer:", message);
          toast.error(message);
        } else {
          checkScoreRequirement(passportResponse?.data?.score);
        }
      }
    } catch (error) {
      console.error("Error submitting passport:", error);
      toast.error("Error submitting passport, please report a bug.");
      setIsSubmiting(false);
    }
    setIsSubmiting(false);
  };

  const submitPassport = async (
    address: string,
  ): Promise<SubmitPassportResponse> => {
    try {
      const response = await fetch("/api/passport/submit-passport", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        return {
          error: true,
          data: response,
        };
      }

      const data = await response.json();

      return { error: false, data };
    } catch (err) {
      return {
        error: true,
        data: err,
      };
    }
  };

  const writeSybil = async (address: string): Promise<any> => {
    try {
      let response;
      if (strategy.sybil?.type === "GoodDollar") {
        response = await fetch(
          `/api/good-dollar/write-validity/${chainFromPath?.id}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ user: address }),
          },
        );
        if (!response.ok) {
          toast.error("Error connecting to Gardens");
          console.error("Error writing GoodDollar validity", response);
          return {
            error: true,
            errorMessage: response.statusText,
          };
        }
      } else if (strategy.sybil?.type === "Passport") {
        response = await fetch(
          `/api/passport-oracle/write-score/${chainFromPath?.id}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ user: address }),
          },
        );
      } else {
        throw new Error("Invalid sybil strategy type");
      }

      if (!response.ok) {
        return {
          error: true,
          data: response,
          errorMessage: await response.text(),
        };
      }

      const data = await response.json();

      if (strategy.sybil?.type === "Passport") {
        publish({
          topic: "member",
          type: "update",
          id: address,
          chainId: chainFromPath?.id,
        });
      }

      console.debug("Response from writeScorer API:", data);
      return data;
    } catch (err) {
      console.error("Error calling writeScorer API:", err);
      return {
        error: true,
        errorMessage: err,
      };
    }
  };

  const handleGoodDollarVerification = async () => {
    if (!walletClient || !switchNetworkAsync) {
      toast.error("Wallet not connected");
      console.error("WalletClient not found");
      return;
    }
    setIsGoodDollarVerifying(true);

    if (walletClient.chain?.id !== celo.id) {
      await switchNetworkAsync?.(celo.id);
    }
    const { data: raw } = await refetchWalletClient();
    if (!raw) {
      toast.error("Celo client not found");
      console.error("Celo client not found");
      return;
    }

    const celoClient = {
      ...raw,
      chain: celo,
    } as typeof raw;

    try {
      const sdk = new IdentitySDK({
        account: celoClient?.account.address as `0x${string}`,
        publicClient,
        walletClient: celoClient,
        env:
          (process.env.NEXT_PUBLIC_CHEAT_GOODDOLLAR_ENV as contractEnv) ??
          "production",
      });
      const callbackUrl = `${window.location.href}?${QUERY_PARAMS.poolPage.goodDollar}=true`;
      const link = await sdk?.generateFVLink(false, callbackUrl, celo.id);

      if (walletClient.chain?.id !== celo.id) {
        await switchNetworkAsync(chainFromPath?.id);
      }
      window.location.href = link;
    } catch (error) {
      console.error("Error generating GoodDollar link:", error);
      setIsGoodDollarVerifying(false);
      if (walletClient.chain?.id !== celo.id) {
        await switchNetworkAsync(chainFromPath?.id);
      }
    }
  };

  const modalTitle = () => {
    if (strategy.sybil?.type === "GoodDollar") {
      if (!isWalletVerified) {
        return "Verify you're human";
      }

      if (!isGoodDollarVerifiedInGardens && !forceIsVerified) {
        return "Connect to Gardens";
      }

      return "Activate Governance";
    }
    return "Gitcoin passport";
  };

  return (
    <>
      <div onClickCapture={(e) => handleCheckSybil(e)} className="w-full">
        {children}
      </div>
      <Modal
        title={modalTitle()}
        isOpen={isModalOpened}
        onClose={() => setIsModalOpen(false)}
        size="small"
      >
        <div className="flex flex-col gap-8">
          {strategy.sybil?.type === "GoodDollar" ?
            isWalletVerified == null ?
              <LoadingSpinner className="w-12 h-12" />
            : <>
                {(
                  (!isWalletVerified && !isGoodDollarCallback) ||
                  !isGoodDollarSuccess
                ) ?
                  <>
                    <p className="text-left">
                      Please confirm you&apos;re a unique human with a secure,
                      encrypted face scan on GoodDollar.
                    </p>
                    <div className="flex justify-end">
                      <Button
                        className="w-fit"
                        onClick={handleGoodDollarVerification}
                        isLoading={isGoodDollarVerifying}
                      >
                        Verify with GoodDollar
                      </Button>
                    </div>
                  </>
                : (
                  (isWalletVerified &&
                    (isGoodDollarVerifiedInGardens ?? false)) ||
                  forceIsVerified
                ) ?
                  <>
                    <p className="text-left">
                      Sign to activate your governance in the pool.
                    </p>
                    <div className="flex justify-end">{children}</div>
                  </>
                : <>
                    <p className="text-left">
                      {isWalletVerified && !isGoodDollarVerifiedInGardens ?
                        "Click to connect your verified GoodDollar account to Gardens."
                      : "GoodDollar verification pending..."}
                    </p>
                    <div className="flex justify-end">
                      <Button
                        className="w-fit"
                        btnStyle={
                          isWalletVerified && !isGoodDollarVerifiedInGardens ?
                            "filled"
                          : "outline"
                        }
                        isLoading={isGoodDollarVerifying}
                        onClick={async () => {
                          setIsGoodDollarVerifying(true);
                          const isVerified = await refetchGoodDollar();
                          if (isVerified) {
                            const { data: isGardensVerified } =
                              await refetchGoodDollarIsVerifiedInGardens();
                            if (!isGardensVerified) {
                              const resp = await writeSybil(
                                walletAddr as Address,
                              );
                              if (!resp.error) {
                                setForceIsVerified(true);
                              }
                            }
                          }
                          setIsGoodDollarVerifying(false);
                        }}
                      >
                        {isWalletVerified && !isGoodDollarVerifiedInGardens ?
                          "Connect"
                        : "Check again"}
                      </Button>
                    </div>
                  </>
                }
              </>

          : <>
              <div>
                <p>
                  Passport score:{" "}
                  <Skeleton isLoading={passportUserFetching && !score}>
                    <span className="font-semibold w-12">
                      {score.toFixed(2)}
                    </span>
                  </Skeleton>
                </p>
                <p>
                  Pool requirement:{" "}
                  <span className="font-semibold">{threshold.toFixed(2)}</span>
                </p>
                {score > threshold ?
                  <div>
                    <h5 className="mt-6">Congratulations!</h5>
                    <p>
                      Your score meets the pool requirement. You can proceed.
                    </p>
                  </div>
                : <p className="mt-6">
                    Your score is too low, please go to Gitcoin passport{" "}
                    <a
                      href="https://passport.gitcoin.co/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-content underline hover:text-primary-hover-content"
                    >
                      website
                    </a>{" "}
                    to increment it before continuing.
                  </p>
                }
              </div>
              {walletAddr && (
                <div className="flex justify-end">
                  {score > threshold ?
                    children
                  : <Button
                      onClick={() => submitAndWriteScorer(walletAddr)}
                      className="w-fit"
                      btnStyle="outline"
                      isLoading={isSubmiting || passportUserFetching}
                      disabled={passportUserFetching}
                      tooltip={
                        passportUserFetching ? "Fetching passport score..." : ""
                      }
                    >
                      Check again
                    </Button>
                  }
                </div>
              )}
            </>
          }
        </div>
      </Modal>
    </>
  );
}
