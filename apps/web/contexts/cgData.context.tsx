"use client";

import type {
  CommunityInfoResponsePayload,
  UserInfoResponsePayload,
} from "@common-ground-dao/cg-plugin-lib";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCgPluginLib } from "./cgPluginLib.context";

type CgData = {
  userInfo: UserInfoResponsePayload | null;
  __userInfoRawResponse: string | null;
  communityInfo: CommunityInfoResponsePayload | null;
  __communityInfoRawResponse: string | null;
  isAdmin: boolean;
  refresh: () => Promise<void>;
};

const CgDataContext = createContext<CgData>({
  userInfo: null,
  __userInfoRawResponse: null,
  communityInfo: null,
  __communityInfoRawResponse: null,
  isAdmin: false,
  refresh: async () => {},
});

const REFRESH_INTERVAL = parseInt(
  process.env.NEXT_PUBLIC_CG_DATA_REFRESH_INTERVAL || "60000",
);

export function CgDataProvider({ children }: { children: React.ReactNode }) {
  const promiseRef = useRef<Promise<void> | null>(null);
  const cgPluginLib = useCgPluginLib();
  const [cgData, setCgData] = useState<Omit<CgData, "refresh">>({
    userInfo: null,
    __userInfoRawResponse: null,
    communityInfo: null,
    __communityInfoRawResponse: null,
    isAdmin: false,
  });

  const loadData = useCallback(async () => {
    if (!cgPluginLib) throw new Error("CgPluginLib not initialized");

    const [userInfo, communityInfo] = await Promise.all([
      cgPluginLib.getUserInfo(),
      cgPluginLib.getCommunityInfo(),
    ]);

    const isAdmin = communityInfo.data.roles.some(
      (role) =>
        role.title === "Admin" &&
        role.type === "PREDEFINED" &&
        userInfo.data.roles.includes(role.id),
    );

    return {
      userInfo: userInfo.data,
      __userInfoRawResponse: userInfo.__rawResponse,
      communityInfo: communityInfo.data,
      __communityInfoRawResponse: communityInfo.__rawResponse,
      isAdmin,
    };
  }, [cgPluginLib]);

  const refresh = useCallback(async () => {
    if (!promiseRef.current) {
      promiseRef.current = (async () => {
        const data = await loadData();
        setCgData(data);
      })().finally(() => {
        promiseRef.current = null;
      });
    }
    return promiseRef.current;
  }, [loadData]);

  useEffect(() => {
    if (!cgPluginLib) return;

    refresh();
    const interval = setInterval(() => {
      refresh().catch((error) =>
        console.error("[CG Plugin] Failed to refresh data:", error),
      );
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [cgPluginLib, refresh]);

  const value = useMemo(() => ({ ...cgData, refresh }), [cgData, refresh]);

  return (
    <CgDataContext.Provider value={value}>{children}</CgDataContext.Provider>
  );
}

export function useCgData() {
  return useContext(CgDataContext);
}
