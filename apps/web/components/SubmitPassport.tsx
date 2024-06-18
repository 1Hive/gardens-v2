"use client";
import React, { useState } from "react";
import { Button } from "./Button";
import { useAccount, useSignMessage } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { toast } from "react-toastify";

interface SignMessageResponse {
  nonce: string;
  message: string;
}

interface SubmitPassportResponse {
  score: string;
}

export function SubmitPassport() {
  const { address: connectedAccount } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [nonce, setNonce] = useState<string | null>(null);

  async function handleOnClick() {
    if (connectedAccount) {
    } else {
      openConnectModal?.();
    }
  }

  const getSigningMessage = async (): Promise<string | null> => {
    const SIGNING_MESSAGE_URI = "/api/passport/signMessage";

    try {
      const response = await fetch(SIGNING_MESSAGE_URI, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      const json: SignMessageResponse = await response.json();

      setNonce(json.nonce);
      return json.message;
    } catch (err) {
      console.log("error: ", err);
      return null;
    }
  };

  const submitSignedPassport = async (
    address: string,
    signature: string,
    nonce: string,
  ): Promise<SubmitPassportResponse | null> => {
    const SUBMIT_SIGNED_PASSPORT_URI = "/api/passport/submitPassport";

    try {
      const response = await fetch(SUBMIT_SIGNED_PASSPORT_URI, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address, signature, nonce }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit signed passport");
      }

      const data: SubmitPassportResponse = await response.json();
      console.log("Response from server:", data);

      return data;
    } catch (err) {
      console.error("Error submitting signed passport:", err);
      return null;
    }
  };

  const writeScorer = async (
    address: string,
    score: string,
    signature: string,
    message: string,
  ): Promise<void> => {
    const WRITE_SCORER_URI = "/api/passport-oracle/writeScore";

    try {
      const response = await fetch(WRITE_SCORER_URI, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user: address, score, signature, message }),
      });

      const data = await response.json();
      console.log("Response from writeScorer API:", data);
    } catch (err) {
      console.error("Error calling writeScorer API:", err);
    }
  };

  const { signMessage } = useSignMessage({
    onSuccess: async (data, variables) => {
      if (connectedAccount && nonce) {
        const passportResponse = await submitSignedPassport(
          connectedAccount,
          data,
          nonce,
        );

        if (passportResponse) {
          await writeScorer(
            connectedAccount,
            passportResponse.score,
            data,
            variables.message,
          );
        }
      }
    },
  });

  const handleSignMessage = async () => {
    if (!connectedAccount) {
      toast.error("Please connect your wallet first");
      return;
    }

    const message = await getSigningMessage();
    if (message) {
      signMessage({ message });
    }
  };
  return (
    <>
      <div className="flex flex-col gap-4 pl-4">
        <Button onClick={handleSignMessage} className="w-fit bg-primary">
          Submit Passport
        </Button>
      </div>
    </>
  );
}
