"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useRef,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { QUERY_PARAMS } from "@/constants/query-params";
import { logOnce } from "@/utils/log";

const SIMULATED_WALLET_KEY = QUERY_PARAMS.simulatedWallet;
const SIMULATED_WALLET_ALIASES = [SIMULATED_WALLET_KEY, "simulateWallet"];
const PERSISTED_QUERY_KEYS = [SIMULATED_WALLET_KEY];
const persistedParamsCache: Record<string, string> = {};

const normalizeSimulatedWalletParam = (
  params: Record<string, string>,
): Record<string, string> => {
  const normalized = { ...params };
  for (const alias of SIMULATED_WALLET_ALIASES) {
    if (alias === SIMULATED_WALLET_KEY) continue;
    if (
      normalized[alias] != null &&
      normalized[SIMULATED_WALLET_KEY] == null
    ) {
      normalized[SIMULATED_WALLET_KEY] = normalized[alias];
    }
    delete normalized[alias];
  }
  return normalized;
};

const collectPersistedParams = () => {
  const entries = PERSISTED_QUERY_KEYS.map((key) => {
    const value = persistedParamsCache[key];
    return value ? [key, value] : null;
  }).filter((entry): entry is [string, string] => entry != null);

  return Object.fromEntries(entries);
};

const persistParams = (params: Record<string, string>) => {
  PERSISTED_QUERY_KEYS.forEach((key) => {
    const value = params[key];
    if (!Object.prototype.hasOwnProperty.call(params, key)) return;

    if (value) {
      persistedParamsCache[key] = value;
      return;
    }

    delete persistedParamsCache[key];
  });
};

// Define the context
interface QueryParamsContextType {
  [key: string]: string;
}
const QueryParamsContext = createContext<QueryParamsContextType | undefined>(
  undefined,
);

// Create a provider component
export const QueryParamsProvider = ({ children }: { children: ReactNode }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const [queryParams, setQueryParams] = useState<{ [k: string]: string }>({});
  const pathRef = useRef(path);

  useEffect(() => {
    const persistedParams = collectPersistedParams();

    if (pathRef.current !== path) {
      setQueryParams(persistedParams);
      pathRef.current = path;
      logOnce(
        "debug",
        "QueryParamsProvider: changed path, resetting query params",
      );
    }

    const runtimeSearchParams =
      searchParams.size ?
        searchParams
      : typeof window !== "undefined" ?
        new URLSearchParams(window.location.search)
      : undefined;

    if (runtimeSearchParams?.size) {
      const newParams = normalizeSimulatedWalletParam(
        Object.fromEntries(runtimeSearchParams.entries()),
      );
      setQueryParams((prev) => ({ ...prev, ...newParams }));
      persistParams(newParams);
      logOnce(
        "debug",
        "QueryParamsProvider: collected query params",
        newParams,
      );
      router.replace(path);
      return;
    }

    setQueryParams((prev) => {
      if (Object.keys(prev).length || !Object.keys(persistedParams).length) {
        return prev;
      }
      return persistedParams;
    });
  }, [searchParams, path, router]);

  return (
    <QueryParamsContext.Provider value={queryParams}>
      {children}
    </QueryParamsContext.Provider>
  );
};

// Custom hook to use the query parameters
export const useCollectQueryParams = () => {
  const context = useContext(QueryParamsContext);
  if (context === undefined) {
    throw new Error(
      "useCollectQueryParams must be used within a QueryParamsProvider",
    );
  }
  return context;
};
