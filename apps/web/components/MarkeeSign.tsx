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

// The existing Gardens root For Sale board. Communities keep their rental flow.
const ROOT_PLACEMENT: Placement = {
  kind: "board",
  chainId: 8453,
  address: "0x2768BC6e90266248BD8bCF5401C36D8049CdF671",
};

export default function MarkeeSign() {
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
      radius: 12,
      fontFamily: "inherit",
      colors: {
        background: isDarkTheme ? "#1A1A1A" : "#FCFFF7",
        surface: isDarkTheme ? "#252525" : "#FFFFFF",
        text: isDarkTheme ? "#EEEEEE" : "#252525",
        inputBackground: isDarkTheme ? "#1A1A1A" : "#FCFFF7",
        inputText: isDarkTheme ? "#EEEEEE" : "#252525",
        primary: isDarkTheme ? "#63B693" : "#65AD18",
        primaryText: "#1A1A1A",
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
    <div className="mx-auto mt-6 mb-4 w-full max-w-lg">
      <SDKSign
        key={signRevision}
        placement={ROOT_PLACEMENT}
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
          placement={ROOT_PLACEMENT}
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
