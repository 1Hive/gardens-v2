"use client";
import React from "react";
import { toast } from "react-toastify";
import { useAccount } from "wagmi";
import { Button } from "./Button";

interface SubmitPassportResponse {
  data: any;
  error: boolean;
}

export function SubmitPassport() {
  const { address: connectedAccount } = useAccount();

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
          data: {},
        };
      }

      const data = await response.json();
      console.log("Response from server:", data);

      return { error: false, data };
    } catch (err) {
      console.error("Error submitting passport:", err);
      return {
        error: true,
        data: {},
      };
    }
  };

  const writeScorer = async (address: string, score: string): Promise<any> => {
    const WRITE_SCORER_URI = "/api/passport-oracle/writeScore";

    try {
      const response = await fetch(WRITE_SCORER_URI, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user: address, score }),
      });

      if (!response.ok) {
        return {
          error: true,
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

  const handleSubmitPassport = async () => {
    if (!connectedAccount) {
      return;
    }

    const passportResponse = await submitPassport(connectedAccount);

    if (!passportResponse.error) {
      const writeScorerData = await writeScorer(
        connectedAccount,
        passportResponse.data.score,
      );
      if (!writeScorerData.error) {
        toast.success("Passport submitted and score written successfully!");
      } else {
        toast.error("Failed to write score.");
      }
    } else {
      toast.error("Failed to submit passport.");
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 pl-4">
        <Button
          onClick={handleSubmitPassport}
          disabled={!connectedAccount}
          className="w-fit bg-primary"
        >
          Submit Passport
        </Button>
      </div>
    </>
  );
}
