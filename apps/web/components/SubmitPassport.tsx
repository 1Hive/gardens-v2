"use client";
import React, { useState } from "react";
import { Button } from "./Button";
import { useAccount, useSignMessage } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

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

  const getSigningMessage = async () => {
    const SIGNING_MESSAGE_URI = "/api/passport/signMessage";

    try {
      const response = await fetch(SIGNING_MESSAGE_URI, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      const json = await response.json();

      console.log("Signing message response", json);
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
  ) => {
    const SUBMIT_SIGNED_PASSPORT_URI = "/api/passport/submitPassport";

    try {
      const response = await fetch(SUBMIT_SIGNED_PASSPORT_URI, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address, signature, nonce }),
      });

      const data = await response.json();
      console.log("Response from server:", data);
    } catch (err) {
      console.error("Error submitting signed passport:", err);
    }
  };

  const { signMessage } = useSignMessage({
    onSuccess: async (data, variables) => {
      console.log("variables ", variables);
      console.log("signature ", data);
      if (connectedAccount && nonce) {
        await submitSignedPassport(connectedAccount, data, nonce);
      }
    },
  });

  const handleSignMessage = async () => {
    if (!connectedAccount) {
      alert("Please connect your wallet first");
      return;
    }

    const message = await getSigningMessage();
    console.log("Signing message:", message);
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
