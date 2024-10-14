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
import { isProd } from "@/configs/isProd";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
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

// CheckPassport component should only wrap a Button or similar component

export function CheckPassport({
  strategyAddr,
  children,
  enableCheck = true,
}: CheckPassportProps) {
  const { address: walletAddr } = useAccount();
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [score, setScore] = useState<number>(0);
  const [shouldOpenModal, setShouldOpenModal] = useState(false);
  const [isSubmiting, setIsSubmiting] = useState<boolean>(false);
  const chainFromPath = useChainIdFromPath();

  //pool threshold should be ready on!

  useEffect(() => {
    if (!enableCheck) {
      return;
    }
    if (shouldOpenModal) {
      setIsOpenModal(true);
      setShouldOpenModal(false);
    }
  }, [shouldOpenModal]);

  const { data: passportUserData } = useSubgraphQuery<getPassportUserQuery>({
    query: getPassportUserDocument,
    variables: { userId: walletAddr?.toLowerCase() },
    enabled: !!walletAddr && enableCheck,
    //TODO: add changeScope = passportUserData
  });
  const passportUser = passportUserData?.passportUser;

  console.log({
    walletAddr: walletAddr?.toLowerCase(),
    passportUserData,
    passportUser,
    enableCheck,
  });

  const { data: passportStrategyData } =
    useSubgraphQuery<getPassportStrategyQuery>({
      query: getPassportStrategyDocument,
      variables: { strategyId: strategyAddr },
      enabled: enableCheck,
      //TODO: add changeScope = passport
    });

  const passportStrategy = passportStrategyData?.passportStrategy;
  const threshold =
    passportStrategy?.threshold ?
      Number(passportStrategy?.threshold) / CV_PERCENTAGE_SCALE
    : 10000;

  if (!enableCheck) {
    return <>{children}</>;
  }

  //force active passport for testing
  if (!isProd) {
    (window as any).togglePassportEnable = (enable: boolean): string => {
      if (passportStrategy) {
        passportStrategy.active = enable;
        return "passportStrategy.active set to " + enable;
      } else {
        return "No passportStrategy found";
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
      setIsOpenModal(false);
    }
  };

  const checkPassportRequirements = (
    _walletAddr: Address,
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    if (passportUser) {
      checkScoreRequirement(
        Number(passportUser?.score) / CV_PERCENTAGE_SCALE,
        e,
      );
    } else {
      console.debug("No passport found, Submitting passport...");
      e.preventDefault();
      e.stopPropagation();
      submitAndWriteScorer(_walletAddr);
    }
  };

  const checkScoreRequirement = (
    _score: number | string,
    e?: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    _score = Number(_score);
    setScore(_score);
    if (score >= threshold) {
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
        await writeScorer(_walletAddr);
        checkScoreRequirement(passportResponse?.data?.score);
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
    const SUBMIT_SIGNED_PASSPORT_URI = "/api/passport/submit-passport";

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
    const WRITE_SCORER_URI = `/api/passport-oracle/writeScore/${chainFromPath}`;
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

      <Modal
        title="Gitcoin passport"
        isOpen={isOpenModal}
        onClose={() => setIsOpenModal(false)}
      >
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
            {score > threshold ?
              <div>
                <h5 className="mt-6">Congratulations!</h5>
                <p>Your score meets the pool requirement. You can proceed.</p>
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
