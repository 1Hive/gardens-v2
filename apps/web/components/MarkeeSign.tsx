"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MarkeeTheme, Placement, WalletAdapter } from "@markee_team/sdk";
import {
  MarkeeSign as SDKSign,
  MarkeeModal as SDKModal,
} from "@markee_team/sdk/react";
import { useModal } from "connectkit";
import { useAccount } from "wagmi";
import { useTheme } from "@/providers/ThemeProvider";

// The existing Gardens root For Sale board.
const ROOT_PLACEMENT: Placement = {
  kind: "board",
  chainId: 8453,
  address: "0x2768BC6e90266248BD8bCF5401C36D8049CdF671",
};

export default function MarkeeSign({
  placement = ROOT_PLACEMENT,
  className = "mx-auto mt-6 mb-4 w-full max-w-lg",
}: {
  placement?: Placement;
  className?: string;
}) {
  const { connector, isConnected } = useAccount();
  const { open: connectOpen, setOpen: setConnectOpen } = useModal();
  const { isDarkTheme } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [awaitingWallet, setAwaitingWallet] = useState(false);
  const [signRevision, setSignRevision] = useState(0);
  const sawConnectOpen = useRef(false);

  const wallet = useMemo<WalletAdapter>(
    () => ({
      getProvider: async () =>
        isConnected && connector ? connector.getProvider() : null,
    }),
    [connector, isConnected],
  );
  const theme = useMemo<MarkeeTheme>(
    () => ({
      mode: isDarkTheme ? "dark" : "light",
      radius: 18,
      cardRadius: 12,
      controlRadius: 8,
      fontFamily: "inherit",
      colors: {
        background: isDarkTheme ? "#252525" : "#FCFFF7",
        surface: isDarkTheme ? "#1A1A1A" : "#FFFFFF",
        text: isDarkTheme ? "#EEEEEE" : "#252525",
        inputBackground: isDarkTheme ? "#1A1A1A" : "#FCFFF7",
        inputText: isDarkTheme ? "#EEEEEE" : "#252525",
        primary: isDarkTheme ? "#42936D" : "#65AD18",
        primaryText: isDarkTheme ? "#FFFFFF" : "#1A1A1A",
        muted: isDarkTheme ? "#999999" : "#666D60",
        border: isDarkTheme ? "#454545" : "#D7DDCF",
        link: isDarkTheme ? "#63B693" : "#43880F",
        focusRing: isDarkTheme ? "#63B693" : "#65AD18",
        accent: isDarkTheme ? "#63B693" : "#65AD18",
        accentText: isDarkTheme ? "#EEEEEE" : "#252525",
        accentSurface: isDarkTheme ? "#202824" : "#F0F7E9",
        accentSurfaceText: isDarkTheme ? "#63B693" : "#43880F",
        accentBorder: isDarkTheme ? "#477B65" : "#A2C480",
        selected: isDarkTheme ? "#263C32" : "#E7F2DC",
        selectedText: isDarkTheme ? "#63B693" : "#43880F",
        info: isDarkTheme ? "#292D2B" : "#EFF4E9",
        infoText: isDarkTheme ? "#BBBBBB" : "#536548",
        error: isDarkTheme ? "#3A2323" : "#FFF0F0",
        errorText: isDarkTheme ? "#FF5151" : "#B42323",
        success: isDarkTheme ? "#243A2E" : "#EDF7E6",
        successText: isDarkTheme ? "#63B693" : "#43880F",
        overlay: "#00000099",
      },
    }),
    [isDarkTheme],
  );

  useEffect(() => {
    if (!awaitingWallet) return;
    if (isConnected) {
      setAwaitingWallet(false);
      setModalOpen(true);
      sawConnectOpen.current = false;
    } else if (connectOpen) {
      sawConnectOpen.current = true;
    } else if (sawConnectOpen.current) {
      setAwaitingWallet(false);
      sawConnectOpen.current = false;
    }
  }, [awaitingWallet, isConnected, connectOpen]);

  return (
    <div className={className}>
      <SDKSign
        key={signRevision}
        placement={placement}
        theme={theme}
        wallet={wallet}
        onOpen={() => {
          if (isConnected) setModalOpen(true);
          else {
            sawConnectOpen.current = false;
            setAwaitingWallet(true);
            setConnectOpen(true);
          }
        }}
      />
      {modalOpen && (
        <SDKModal
          open
          placement={placement}
          wallet={wallet}
          theme={theme}
          onClose={() => setModalOpen(false)}
          onEvent={(event) => {
            if (event.type === "confirmed") {
              setSignRevision((revision) => revision + 1);
            }
          }}
        />
      )}
    </div>
  );
}
