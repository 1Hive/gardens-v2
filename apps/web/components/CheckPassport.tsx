/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import React, { ReactElement, useEffect, useState } from "react";
import { Address } from "viem";
import { useAccount } from "wagmi";
import {
  getPassportStrategyDocument,
  getPassportStrategyQuery,
  getPassportUserDocument,
  getPassportUserQuery,
} from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { Modal } from "@/components";
import { isProd } from "@/constants/contracts";
import useModal from "@/hooks/useModal";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { CV_PERCENTAGE_SCALE } from "@/utils/numbers";

type SubmitPassportResponse = {
  data: any;
  error: boolean;
};

type CheckPassportProps = {
  strategyAddr: Address;
  children: ReactElement<{
    onClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  }>;
  enableCheck?: boolean;
};

// component should only wrap button component

export function CheckPassport({
  strategyAddr,
  children,
  enableCheck = true,
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
    if (walletAddr) {
      refetchPassportUser();
    }
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
  if (!isProd ) {
    (window as any).togglePassportEnable = ( enable: boolean) => {
      if (passportStrategy) {
        passportStrategy.active = enable;
      }
    };
  }

  const handleCheckPassport = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {

    if (!!passportStrategy && passportStrategy.active) {
      if (walletAddr) {
        checkPassportRequirements(walletAddr, e);
      }
    } else {
      console.debug("No passport required, moving forward...");
      closeModal();
    }
  };

  const checkPassportRequirements = (
    walletAddr: Address,
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    if (passportUser) {
      checkScoreRequirement(
        Number(passportUser?.score) / CV_PERCENTAGE_SCALE,
        passportStrategy?.threshold,
        e,
      );
    } else {
      console.debug("No passport found, Submitting passport...");
      e.preventDefault();
      e.stopPropagation();
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
      console.debug("Score meets threshold, moving forward...");
      setScore(score);
      setThreshold(threshold);
    } else {
      console.debug("Score is too low, opening modal...");
      e?.preventDefault();
      e?.stopPropagation();
      setScore(score);
      setThreshold(threshold);
      setShouldOpenModal(true);
    }
  };

  const submitAndWriteScorer = async (walletAddr: Address) => {
    openModal();
    setIsSubmiting(true);
    try {
      const passportResponse = await submitPassport(walletAddr);
      console.debug(passportResponse);
      if (passportResponse?.data?.score) {
        await writeScorer(walletAddr);
      }
      // gitcoin passport score no need for formating
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
      <div onClickCapture={(e) => handleCheckPassport(e)} className="w-fit">
        {children}
      </div>

      <Modal title="Gitcoin passport" onClose={closeModal} ref={ref}>
        <div className="flex flex-col gap-8">
          <div>
            <p>
              Passport score:{" "}
              <span className="font-semibold">{score.toFixed(2)}</span>
            </p>
            <p>
              Pool requirement:{" "}
              <span className="font-semibold">{threshold.toFixed(2)}</span>
            </p>
            {score > threshold ? (
              <div>
                <h5 className="mt-6">Congratulations!</h5>
                <p>
                 Your score meets the pool requirement. You can proceed.</p>
              </div> ) : (
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
            )}
          </div>
          {walletAddr && (
            <div className="flex justify-end">
              {score > threshold ? (
                children
              ) : (
                <Button
                  onClick={() => submitAndWriteScorer(walletAddr)}
                  className="w-fit"
                  btnStyle="outline"
                  isLoading={isSubmiting}
                >
                  Check again
                </Button>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
