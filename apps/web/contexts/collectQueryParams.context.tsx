import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useRef,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { logOnce } from "@/utils/log";

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
    const params = Object.fromEntries(searchParams.entries());
    setQueryParams((old) => {
      if (!Object.keys(queryParams).length) {
        logOnce("debug", "QueryParamsProvider: collected query params", params);
        return params;
      }
      return old;
    });
  }, [searchParams]);

  useEffect(() => {
    router.push(path); // Navigate to the path without query params
    if (pathRef.current !== path) {
      setQueryParams({}); // Reset query params when changing page
    }
    pathRef.current = path;
  }, [router, path]);

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
    throw new Error("useQueryParams must be used within a QueryParamsProvider");
  }
  return context;
};
