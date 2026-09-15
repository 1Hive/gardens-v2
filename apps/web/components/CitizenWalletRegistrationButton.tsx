"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Address } from "viem";
import { Button } from "./Button";
import { Modal } from "./Modal";
import {
  buildCitizenRegistrationPath,
  CITIZEN_BREAD_WEB_WALLET_URL,
  isBreadCitizenRegistration,
} from "@/utils/citizenWallet";

type Props = {
  chainId: number | undefined;
  communityAddress: Address;
  tokenAddress: string | undefined;
};

type DialogProps = {
  communityAddress: Address;
  isOpen: boolean;
  onClose: () => void;
  onConnectWebWallet?: () => void;
};

export function CitizenWalletRegistrationDialog({
  communityAddress,
  isOpen,
  onClose,
  onConnectWebWallet,
}: DialogProps) {
  const [registrationUrl, setRegistrationUrl] = useState("");
  const registrationPath = useMemo(
    () => buildCitizenRegistrationPath(communityAddress),
    [communityAddress],
  );

  useEffect(() => {
    setRegistrationUrl(new URL(registrationPath, window.location.origin).href);
  }, [registrationPath]);

  return (
    <Modal
      title="Open with Citizen Wallet"
      isOpen={isOpen}
      onClose={onClose}
      size="small"
      testId="citizen-wallet-registration"
    >
      <div className="flex flex-col gap-5 text-center">
        <div className="flex flex-col items-center gap-4">
          <h3>Native Citizen Wallet app</h3>
          <p>
            Open the BREAD community in the native app, select its QR scanner,
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
            Gardens opens inside the native app and requests the BREAD approval
            and registration there.
          </p>
        </div>

        {onConnectWebWallet && (
          <div
            className="flex flex-col items-center gap-4 border-t border-border-neutral pt-5"
            data-testid="citizen-web-wallet-option"
          >
            <h3>Citizen web wallet</h3>
            <p>
              Open the BREAD web wallet on your phone, select its QR scanner,
              then scan the WalletConnect code Gardens shows next.
            </p>
            <Button
              onClick={onConnectWebWallet}
              testId="citizen-web-wallet-connect"
            >
              Show WalletConnect QR
            </Button>
            <a
              className="text-sm text-primary-content underline"
              href={CITIZEN_BREAD_WEB_WALLET_URL}
              target="_blank"
              rel="noreferrer"
            >
              Open BREAD web wallet
            </a>
          </div>
        )}

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
  );
}

export function CitizenWalletRegistrationButton({
  chainId,
  communityAddress,
  tokenAddress,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const isSupported = isBreadCitizenRegistration({ chainId, tokenAddress });

  const close = useCallback(() => setIsOpen(false), []);

  if (!isSupported) return null;

  return (
    <>
      <CitizenWalletRegistrationDialog
        communityAddress={communityAddress}
        isOpen={isOpen}
        onClose={close}
      />
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
