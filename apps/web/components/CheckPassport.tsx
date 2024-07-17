"use client";
import React, { ReactElement, ReactNode, useEffect, useState } from "react";
import { Address } from "viem";
import { useAccount } from "wagmi";
import { Button } from "./Button";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import useModal from "@/hooks/useModal";
import {
  getPassportStrategyDocument,
  getPassportStrategyQuery,
  getPassportUserDocument,
  getPassportUserQuery,
} from "#/subgraph/.graphclient";
import { CV_PERCENTAGE_SCALE } from "@/utils/numbers";
import { Modal } from "@/components";

type SubmitPassportResponse = {
  data: any;
  error: boolean;
};

type CheckPassportProps = {
  strategyAddr: Address;
  children: ReactElement<{
    onClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  }>;
  enableCheck: boolean;
};

// component should only wrap button component

export function CheckPassport({
  strategyAddr,
  children,
  enableCheck,
}: CheckPassportProps) {
  if (!enableCheck) {
    return <>{children}</>;
  }

  const { address: walletAddr } = useAccount();
  const { ref, openModal, closeModal } = useModal();
  const [score, setScore] = useState<number>(0);
  const [threshold, setThreshold] = useState<number>(0);
  const [shouldOpenModal, setShouldOpenModal] = useState(false);
  const [isSubmiting, setIsSubmiting] = useState<boolean>(false);

  useEffect(() => {
    if (shouldOpenModal) {
      openModal();
      setShouldOpenModal(false);
    }
  }, [shouldOpenModal]);

  useEffect(() => {
    refetchPassportUser();
  }, [walletAddr]);

  const { data: passportUserData, refetch: refetchPassportUser } =
    useSubgraphQuery<getPassportUserQuery>({
      query: getPassportUserDocument,
      variables: { userId: walletAddr?.toLowerCase() },
      enabled: !!walletAddr,
      //TODO: add changeScope = passport
    });
  const passportUser = passportUserData?.passportUser;

  const { data: passportStrategyData } =
    useSubgraphQuery<getPassportStrategyQuery>({
      query: getPassportStrategyDocument,
      variables: { strategyId: strategyAddr },
      //TODO: add changeScope = passport
    });
  const passportStrategy = passportStrategyData?.passportStrategy;

  //force active passport for testing
  // if (passportStrategy?.active !== undefined) {
  //   passportStrategy.active = true;
  // }

  const handleCheckPassport = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    if (!!passportStrategy && passportStrategy.active) {
      if (walletAddr) {
        checkPassportRequirements(walletAddr, e);
      } else {
        console.log("No wallet connected...");
      }
    } else {
      console.log("No passport required, you can continue...");
      closeModal();
    }
  };

  const checkPassportRequirements = (
    walletAddr: Address,
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    if (passportUser) {
      checkScoreRequirement(
        passportUser?.score,
        passportStrategy?.threshold,
        e,
      );
    } else {
      console.log("No passport found, Submitting passport...");
      submitAndWriteScorer(walletAddr);
    }
  };

  const checkScoreRequirement = (
    score: number | string,
    threshold: number | string,
    e?: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    score = Number(score);
    threshold = Number(threshold) / CV_PERCENTAGE_SCALE;
    if (score > threshold) {
      closeModal();
    } else {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      setScore(score);
      setThreshold(threshold);
      setShouldOpenModal(true);
    }
  };

  const submitAndWriteScorer = async (walletAddr: Address) => {
    setIsSubmiting(true);
    try {
      const passportResponse = await submitPassport(walletAddr);
      console.log(passportResponse);
      if (passportResponse?.data?.score) {
        const writeScorerData = await writeScorer(walletAddr);
        if (!writeScorerData.error) {
          console.log("Passport submitted and score written successfully!");
        } else {
          console.log("Failed to write score.");
        }
      } else {
        console.log("Failed to submit passport.");
      }

      if (passportResponse?.data?.score) {
        checkScoreRequirement(
          passportResponse?.data?.score,
          passportStrategy?.threshold,
        );
      }
    } catch (error) {
      console.error("Error submitting passport:", error);
      setIsSubmiting(false);
    }
    setIsSubmiting(false);
  };

  const submitPassport = async (
    address: string,
  ): Promise<SubmitPassportResponse> => {
    const SUBMIT_SIGNED_PASSPORT_URI = "/api/passport/submitPassport";

    try {
      const response = await fetch(SUBMIT_SIGNED_PASSPORT_URI, {
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
    const WRITE_SCORER_URI = "/api/passport-oracle/writeScore";
    try {
      const response = await fetch(WRITE_SCORER_URI, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user: address }),
      });

      if (!response.ok) {
        return {
          error: true,
          data: response,
        };
      }

      const data = await response.json();
      console.log("Response from writeScorer API:", data);
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
      <div onClickCapture={(e) => handleCheckPassport(e)} className="w-fit">
        {children}
      </div>

      <Modal title="Gitcoin passport" onClose={closeModal} ref={ref}>
        <div className="flex flex-col gap-8">
          <div>
            <p>
              Passport score:{" "}
              <span className="font-semibold"> {score.toFixed(2)}</span>
            </p>
            <p>
              Pool requirement:{" "}
              <span className="font-semibold"> {threshold.toFixed(2)}</span>
            </p>
            <p className="mt-6">
              Your score is too low, please go to{" "}
              <a
                href="https://passport.gitcoin.co/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-content underline hover:text-primary-hover-content"
              >
                Gitcoin passport website
              </a>{" "}
              to increment it before continuing.
            </p>
          </div>
          {walletAddr && (
            <div className="flex justify-end">
              {score > threshold ?
                children
              : <Button
                  onClick={() => submitAndWriteScorer(walletAddr!)}
                  className="w-fit"
                  btnStyle="outline"
                  isLoading={isSubmiting}
                >
                  Check again
                </Button>
              }
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
