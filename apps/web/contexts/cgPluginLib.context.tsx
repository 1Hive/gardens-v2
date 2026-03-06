"use client";

import type { CgPluginLib } from "@common-ground-dao/cg-plugin-lib";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

const CgPluginLibContext = createContext<CgPluginLib | null>(null);

export function CgPluginLibProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cgPluginLib, setCgPluginLib] = useState<CgPluginLib | null>(null);
  const searchParams = useSearchParams();
  const promiseRef = useRef<Promise<void> | null>(null);

  const iframeUid = useMemo(
    () => searchParams.get("iframeUid"),
    [searchParams],
  );

  useEffect(() => {
    // Not inside CG iframe — skip initialization
    if (!iframeUid) return;

    if (!cgPluginLib && !promiseRef.current) {
      promiseRef.current = (async () => {
        const { CgPluginLib } = await import(
          "@common-ground-dao/cg-plugin-lib"
        );

        const publicKey =
          process.env.NEXT_PUBLIC_CG_PLUGIN_PUBLIC_KEY;
        if (!publicKey) {
          throw new Error("NEXT_PUBLIC_CG_PLUGIN_PUBLIC_KEY is not set");
        }

        const lib = await CgPluginLib.initialize(
          iframeUid,
          "/api/sign",
          publicKey,
        );

        setCgPluginLib(lib);
      })()
        .catch((error) => {
          console.error("[CG Plugin] Initialization failed:", error);
        })
        .finally(() => {
          promiseRef.current = null;
        });
    }
  }, [cgPluginLib, iframeUid]);

  return (
    <CgPluginLibContext.Provider value={cgPluginLib}>
      {children}
    </CgPluginLibContext.Provider>
  );
}

export function useCgPluginLib() {
  return useContext(CgPluginLibContext);
}
