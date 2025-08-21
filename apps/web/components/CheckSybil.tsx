"use client";
import React, { ReactElement, useEffect, useState } from "react";
import { IdentitySDK } from "@goodsdks/citizen-sdk";
import { toast } from "react-toastify";
import { Address } from "viem";
import { celo } from "viem/chains";
import {
  useAccount,
  usePublicClient,
  useSwitchNetwork,
  useWalletClient,
} from "wagmi";
import {
  CVStrategy,
  getGoodDollarStrategyDocument,
  getGoodDollarStrategyQuery,
  getGoodDollarUserDocument,
  getGoodDollarUserQuery,
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
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useGoodDollarSdk } from "@/hooks/useGoodDollar";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
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
};

// CheckPassport component should only wrap a Button or similar component

export function CheckSybil({
  strategy,
  children,
  enableCheck = true,
}: CheckPassportProps) {
  const { address: walletAddr } = useAccount();
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [score, setScore] = useState<number>(0);
  const [shouldOpenModal, setShouldOpenModal] = useState(false);
  const [isSubmiting, setIsSubmiting] = useState<boolean>(false);
  const publicClient = usePublicClient({ chainId: celo.id });
  const { data: walletClient } = useWalletClient({ chainId: celo.id });
  const chainFromPath = useChainIdFromPath();
  const { publish } = usePubSubContext();
  const { switchNetworkAsync } = useSwitchNetwork();
  const { isWalletVerified } = useGoodDollarSdk({
    enabled:
      strategy.sybil != null &&
      strategy.sybil.type === "GoodDollar" &&
      enableCheck,
  });

  useEffect(() => {
    if (!enableCheck) {
      return;
    }
    if (shouldOpenModal) {
      setIsOpenModal(true);
      setShouldOpenModal(false);
    }
  }, [shouldOpenModal]);

  const { data: passportUserData, fetching: passportUserFetching } =
    useSubgraphQuery<getPassportUserQuery>({
      query: getPassportUserDocument,
      variables: { userId: walletAddr?.toLowerCase() },
      enabled:
        !!walletAddr && strategy.sybil?.type === "Passport" && enableCheck,
      changeScope: {
        topic: "member",
        id: walletAddr?.toLowerCase(),
        chainId: chainFromPath,
        type: "update",
      },
    });

  const { data: goodDollarUserData } = useSubgraphQuery<getGoodDollarUserQuery>(
    {
      query: getGoodDollarUserDocument,
      variables: { userId: walletAddr?.toLowerCase() },
      enabled:
        !!walletAddr && strategy.sybil?.type === "GoodDollar" && enableCheck,
      changeScope: {
        topic: "member",
        id: walletAddr?.toLowerCase(),
        chainId: chainFromPath,
        type: "update",
      },
    },
  );

  const { data: passportStrategyData } =
    useSubgraphQuery<getPassportStrategyQuery>({
      query: getPassportStrategyDocument,
      variables: { strategyId: strategy.id.toLowerCase() },
      enabled: enableCheck && strategy.sybil?.type === "Passport",
      changeScope: {
        topic: "member",
        id: strategy.poolId,
        chainId: chainFromPath,
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
        chainId: chainFromPath,
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

  const handleCheckSybil = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    if (strategy.sybil?.type === "GoodDollar") {
      if (walletAddr) {
        if (
          goodDollarUserData?.goodDollarUser &&
          goodDollarUserData.goodDollarUser.verified
        ) {
          console.debug("GoodDollar user is verified, moving forward...");
          setIsOpenModal(false);
        } else if (isWalletVerified) {
          console.debug(
            "Wallet is whitelisted in GoodDollar, submiting verification...",
          );
          writeScorer(walletAddr);
        } else {
          console.debug(
            "Wallet is not whitelisted in GoodDollar, opening modal...",
          );
          e.preventDefault();
          e.stopPropagation();
          setShouldOpenModal(true);
        }
      }
    } else if (strategy.sybil?.type === "Passport" && sybilStrategy?.active) {
      if (walletAddr) {
        checkPassportRequirements(walletAddr, e);
      }
    } else {
      console.debug("No passport required, moving forward...");
      setIsOpenModal(false);
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
      setShouldOpenModal(true);
    }
  };

  const submitAndWriteScorer = async (_walletAddr: Address) => {
    setIsOpenModal(true);
    setIsSubmiting(true);
    try {
      const passportResponse = await submitPassport(_walletAddr);
      console.debug(passportResponse);
      // gitcoin passport score does not need formating
      if (passportResponse?.data?.score) {
        setScore(Number(passportResponse.data.score));
        const result = await writeScorer(_walletAddr);
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

  const writeScorer = async (address: string): Promise<any> => {
    try {
      let response;
      if (strategy.sybil?.type === "GoodDollar") {
        response = await fetch(
          `/api/good-dollar/write-validity/${chainFromPath}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ user: address }),
          },
        );
      } else if (strategy.sybil?.type === "Passport") {
        response = await fetch(
          `/api/passport-oracle/write-score/${chainFromPath}`,
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

      publish({
        topic: "member",
        type: "update",
        id: address,
        chainId: chainFromPath,
      });

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
  return (
    <>
      <div onClickCapture={(e) => handleCheckSybil(e)} className="w-fit">
        {children}
      </div>
      <Modal
        title={
          strategy.sybil?.type === "GoodDollar" ?
            "Good Dollar"
          : "Gitcoin passport"
        }
        isOpen={isOpenModal}
        onClose={() => setIsOpenModal(false)}
        size="small"
      >
        {isWalletVerified == null ?
          <LoadingSpinner className="w-12 h-12" />
        : <div className="flex flex-col gap-8">
            {strategy.sybil?.type === "GoodDollar" ?
              <>
                Please verify with GoodDollar to proceed.
                {walletAddr && isWalletVerified === false ?
                  <div className="flex justify-end">
                    <Button
                      className="w-fit"
                      btnStyle="outline"
                      onClick={async () => {
                        if (!walletClient || !switchNetworkAsync) {
                          console.error("No wallet client found");
                          return;
                        }
                        await switchNetworkAsync(celo.id);
                        setTimeout(async () => {
                          try {
                            // @ts-ignore
                            const sdk = new IdentitySDK({
                              account: walletClient?.account,
                              publicClient,
                              walletClient,
                              chain: celo,
                              env:
                                process.env.NEXT_PUBLIC_CHEAT_GOODDOLLAR_ENV ??
                                "production",
                            });
                            const link = await sdk?.generateFVLink();
                            window.open(link, "_blank");
                          } catch (error) {
                            console.error(
                              "Error generating GoodDollar link:",
                              error,
                            );
                          }
                          await switchNetworkAsync(chainFromPath);
                        }, 500);
                      }}
                    >
                      Verify with GoodDollar
                    </Button>
                  </div>
                : <>
                    <p className="text-center">
                      You are verified with GoodDollar, you can proceed.
                    </p>
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
                    <span className="font-semibold">
                      {threshold.toFixed(2)}
                    </span>
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
                          passportUserFetching ?
                            "Fetching passport score..."
                          : ""
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
        }
      </Modal>
    </>
  );
}
