"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Address } from "viem";
import { Button } from "./Button";
import { Modal } from "./Modal";
import {
  buildCitizenRegistrationPath,
  isBreadCitizenRegistration,
} from "@/utils/citizenWallet";

type Props = {
  chainId: number | undefined;
  communityAddress: Address;
  tokenAddress: string | undefined;
};

export function CitizenWalletRegistrationButton({
  chainId,
  communityAddress,
  tokenAddress,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [registrationUrl, setRegistrationUrl] = useState("");
  const isSupported = isBreadCitizenRegistration({ chainId, tokenAddress });
  const registrationPath = useMemo(
    () => buildCitizenRegistrationPath(communityAddress),
    [communityAddress],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setRegistrationUrl(
        new URL(registrationPath, window.location.origin).href,
      );
    }
  }, [registrationPath]);

  const close = useCallback(() => setIsOpen(false), []);

  if (!isSupported) return null;

  return (
    <>
      <Modal
        title="Open with Citizen Wallet"
        isOpen={isOpen}
        onClose={close}
        size="small"
        testId="citizen-wallet-registration"
      >
        <div className="flex flex-col items-center gap-5 text-center">
          <p>
            Open the BREAD community in Citizen Wallet, select its QR scanner,
            and scan this code.
          </p>
          {registrationUrl && (
            <div
              className="rounded-xl bg-white p-4"
              data-testid="citizen-wallet-qr"
            >
              <QRCodeSVG
                value={registrationUrl}
                size={220}
                title="Gardens Citizen Wallet registration link"
              />
            </div>
          )}
          <p className="text-sm text-neutral-content">
            Gardens will open inside Citizen Wallet. Citizen will ask you to
            confirm the BREAD approval when required and then the registration.
          </p>
          <a
            className="text-sm text-primary-content underline"
            href={registrationPath}
            target="_blank"
            rel="noreferrer"
          >
            Open scanning instructions
          </a>
        </div>
      </Modal>
      <Button
        btnStyle="outline"
        color="primary"
        onClick={() => setIsOpen(true)}
        testId="open-citizen-wallet-button"
      >
        Open with Citizen Wallet
      </Button>
    </>
  );
}
