"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Address, formatUnits, parseAbi } from "viem";
import { Button } from "./Button";
import {
  BREAD_TOKEN_ADDRESS,
  buildCitizenCalldataUrl,
  buildCitizenConnectedUrl,
  type CitizenConnectionParams,
  encodeCitizenApproval,
  encodeCitizenRegistration,
  getCitizenRegistrationAction,
} from "@/utils/citizenWallet";
import {
  type CitizenSubmittedAction,
  waitForCitizenActionConfirmation,
} from "@/utils/citizenWalletConfirmation";
import { reportClientError } from "@/utils/clientErrorReporter";
import { getEnvPublicClient } from "@/utils/publicClient";

const erc20AllowanceAbi = parseAbi([
  "function allowance(address owner, address spender) view returns (uint256)",
]);
const registryMemberAbi = parseAbi([
  "function isMember(address account) view returns (bool)",
]);

type Props = {
  account: Address;
  communityAddress: Address;
  communityName: string;
  redirectUrl: string;
  registrationCost: string;
  balance: string;
  allowance: string;
  isMember: boolean;
  tokenSymbol: string;
  tokenDecimals: number;
  connectionParams: CitizenConnectionParams;
  submittedAction?: CitizenSubmittedAction;
  transactionHash?: string;
};

export function CitizenWalletRegistrationFlow(props: Props) {
  const [isWaiting, setIsWaiting] = useState(false);
  const [error, setError] = useState<string>();

  const registrationCost = BigInt(props.registrationCost);
  const action = getCitizenRegistrationAction({
    isMember: props.isMember,
    balance: BigInt(props.balance),
    allowance: BigInt(props.allowance),
    registrationCost,
  });
  const transactionHash = props.transactionHash;

  const buildConnectedGardensUrl = useCallback(
    () =>
      buildCitizenConnectedUrl(window.location.href, props.connectionParams),
    [props.connectionParams],
  );

  useEffect(() => {
    if (!props.submittedAction) return;

    let cancelled = false;
    setIsWaiting(true);
    setError(undefined);
    const client = getEnvPublicClient(100);

    waitForCitizenActionConfirmation({
      action: props.submittedAction,
      registrationCost,
      readAllowance: () =>
        client.readContract({
          address: BREAD_TOKEN_ADDRESS,
          abi: erc20AllowanceAbi,
          functionName: "allowance",
          args: [props.account, props.communityAddress],
        }),
      readIsMember: () =>
        client.readContract({
          address: props.communityAddress,
          abi: registryMemberAbi,
          functionName: "isMember",
          args: [props.account],
        }),
    })
      .then(() => {
        if (cancelled) return;
        window.location.replace(buildConnectedGardensUrl().toString());
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        reportClientError(cause, {
          type: "citizen-native-confirmation-error",
          submittedAction: props.submittedAction,
          citizenSubmissionHash: transactionHash,
          chainId: 100,
          connectedAddress: props.account,
          communityAddress: props.communityAddress,
          tags: {
            error_type: "citizen-native-confirmation-error",
            chain_id: 100,
            citizen_action: props.submittedAction,
          },
        });
        setError(
          cause instanceof Error ?
            cause.message
          : "Transaction confirmation failed.",
        );
      })
      .finally(() => {
        if (!cancelled) setIsWaiting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    buildConnectedGardensUrl,
    props.account,
    props.communityAddress,
    props.submittedAction,
    registrationCost,
    transactionHash,
  ]);

  const buttonLabel = useMemo(() => {
    if (isWaiting) return "Waiting for confirmation…";
    if (action === "approve") return `Approve ${props.tokenSymbol}`;
    if (action === "register") return `Register in ${props.communityName}`;
    return "Registration unavailable";
  }, [action, isWaiting, props.communityName, props.tokenSymbol]);

  const requestTransaction = () => {
    setError(undefined);
    const currentUrl = buildConnectedGardensUrl();
    currentUrl.searchParams.set(
      "citizenAction",
      action === "approve" ? "approval-submitted" : "registration-submitted",
    );

    const isApproval = action === "approve";
    const target = isApproval ? BREAD_TOKEN_ADDRESS : props.communityAddress;
    const calldata =
      isApproval ?
        encodeCitizenApproval({
          communityAddress: props.communityAddress,
          amount: registrationCost,
        })
      : encodeCitizenRegistration();

    window.location.assign(
      buildCitizenCalldataUrl({
        redirectUrl: props.redirectUrl,
        target,
        calldata,
        successUrl: currentUrl.toString(),
      }),
    );
  };

  if (action === "already-registered") {
    return (
      <div className="flex flex-col gap-5" data-testid="citizen-wallet-success">
        <h2>Registration complete</h2>
        <p>
          Citizen account <span className="font-mono">{props.account}</span> is
          registered in {props.communityName}.
        </p>
        <Link
          href={`/gardens/100/${props.communityAddress}`}
          className="text-primary-content underline"
        >
          Continue to the Garden
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5" data-testid="citizen-wallet-flow">
      <div>
        <h2>Register with Citizen Wallet</h2>
        <p className="mt-2 text-sm">
          Connected Citizen account:{" "}
          <span className="font-mono">{props.account}</span>
        </p>
      </div>

      <div className="rounded-xl border border-border-neutral p-4">
        <p>
          Required: {formatUnits(registrationCost, props.tokenDecimals)}{" "}
          {props.tokenSymbol}
        </p>
        <p>
          Balance: {formatUnits(BigInt(props.balance), props.tokenDecimals)}{" "}
          {props.tokenSymbol}
        </p>
      </div>

      {action === "insufficient-balance" ?
        <p
          className="text-danger-content"
          data-testid="citizen-insufficient-balance"
        >
          This Citizen account needs more {props.tokenSymbol} before it can
          register.
        </p>
      : <>
          <p className="text-sm">
            Covenant signing is bypassed for this verified Citizen Wallet flow.
            Confirming registration records the Citizen smart account as the
            member.
          </p>
          <Button
            onClick={requestTransaction}
            disabled={isWaiting}
            isLoading={isWaiting}
            testId="citizen-registration-action"
          >
            {buttonLabel}
          </Button>
        </>
      }

      {error && (
        <p className="text-danger-content" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
