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

const PERSISTED_QUERY_KEYS = [QUERY_PARAMS.simulatedWallet];
const persistedParamsCache: Record<string, string> = {};

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
    if (value) {
      persistedParamsCache[key] = value;
    } else if (Object.prototype.hasOwnProperty.call(params, key)) {
      delete persistedParamsCache[key];
    }
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

    if (searchParams.size) {
      const newParams = Object.fromEntries(searchParams.entries());
      setQueryParams((prev) => ({ ...prev, ...newParams }));
      persistParams(newParams);
      logOnce(
        "debug",
        "QueryParamsProvider: collected query params",
        newParams,
      );
      router.push(path);
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
