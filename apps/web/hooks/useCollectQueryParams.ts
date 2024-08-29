import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { logOnce } from "@/utils/log";

export const useCollectQueryParams = () => {
  const router = useRouter();
  const path = usePathname();
  const searchParams = useSearchParams();
  const queryParamsRef = useRef<Record<string, string>>();

  useEffect(() => {
    if (queryParamsRef.current) {
      return; // already collected
    }
    const temp = Array.from(searchParams.entries()).reduce<
      Record<string, string>
    >((acc, [key, value]) => {
      acc[key] = value || "";
      return acc;
    }, {});
    queryParamsRef.current = temp;
    router.replace(path, { search: "" });
    logOnce("debug", "Collected query params: ", temp);
  }, []);

  return queryParamsRef.current ?? {};
};
