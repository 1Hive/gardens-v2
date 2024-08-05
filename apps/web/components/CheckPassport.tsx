"use client";
import React, { ReactElement, useCallback, useMemo, useState } from "react";
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
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { CV_PERCENTAGE_SCALE } from "@/utils/numbers";

type CheckPassportProps = {
  strategyAddr: Address;
  children: ReactElement<{
    onClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  }>;
  enableCheck?: boolean;
};

export function CheckPassport({
  strategyAddr,
  children,
  enableCheck = true,
}: CheckPassportProps) {
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

  const { address: walletAddr } = useAccount();
  const [score, setScore] = useState<number>(0);
  const [threshold, setThreshold] = useState<number>(0);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { data: passportUserData } = useSubgraphQuery<getPassportUserQuery>({
    query: getPassportUserDocument,
    variables: { userId: walletAddr?.toLowerCase() },
    enabled: !!walletAddr && enableCheck,
  });

  const { data: passportStrategyData } =
    useSubgraphQuery<getPassportStrategyQuery>({
      query: getPassportStrategyDocument,
      variables: { strategyId: strategyAddr },
      enabled: enableCheck,
    });

  const passportUser = passportUserData?.passportUser;
  const passportStrategy = passportStrategyData?.passportStrategy;

  const isPassportRequired = useMemo(
    () => !!passportStrategy && passportStrategy.active,
    [passportStrategy],
  );

  const submitPassport = useCallback(async (address: string) => {
    const response = await fetch("/api/passport/submitPassport", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });
    if (!response.ok) throw new Error("Failed to submit passport");
    return response.json();
  }, []);

  const writeScorer = useCallback(async (address: string) => {
    const response = await fetch("/api/passport-oracle/writeScore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: address }),
    });
    if (!response.ok) throw new Error("Failed to write scorer");
    return response.json();
  }, []);

  const checkScoreRequirement = useCallback(
    (userScore: number, strategyThreshold: number) => {
      const normalizedScore = userScore / CV_PERCENTAGE_SCALE;
      const normalizedThreshold = strategyThreshold / CV_PERCENTAGE_SCALE;
      setScore(normalizedScore);
      setThreshold(normalizedThreshold);
      return normalizedScore > normalizedThreshold;
    },
    [],
  );

  const handleCheckPassport = useCallback(
    async (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (!isPassportRequired || !walletAddr) return;

      e.preventDefault();
      e.stopPropagation();

      setIsSubmitting(true);
      try {
        if (!passportUser) {
          const passportResponse = await submitPassport(walletAddr);
          await writeScorer(walletAddr);
          if (passportResponse?.score) {
            const meetsRequirement = checkScoreRequirement(
              passportResponse.score,
              passportStrategy?.threshold,
            );
            if (!meetsRequirement) setIsOpenModal(true);
          }
        } else {
          const meetsRequirement = checkScoreRequirement(
            Number(passportUser.score),
            passportStrategy?.threshold,
          );
          if (!meetsRequirement) setIsOpenModal(true);
        }
      } catch (error) {
        console.error("Error checking passport:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      walletAddr,
      passportUser,
      passportStrategy,
      isPassportRequired,
      submitPassport,
      writeScorer,
      checkScoreRequirement,
    ],
  );

  if (!enableCheck) return <>{children}</>;

  return (
    <>
      <div onClickCapture={handleCheckPassport} className="w-fit">
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
            }
          </div>
          {walletAddr && (
            <div className="flex justify-end">
              {score > threshold ?
                children
              : <Button
                  onClick={() =>
                    handleCheckPassport({
                      preventDefault: () => {},
                      stopPropagation: () => {},
                    } as any)
                  }
                  className="w-fit"
                  btnStyle="outline"
                  isLoading={isSubmitting}
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
