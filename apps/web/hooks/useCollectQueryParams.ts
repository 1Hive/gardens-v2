import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const useCollectQueryParams = () => {
  const router = useRouter();
  const path = usePathname();
  const searchParams = useSearchParams();
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const temp = Array.from(searchParams.entries()).reduce<
      Record<string, string>
    >((acc, [key, value]) => {
      acc[key] = value || "";
      return acc;
    }, {});
    setQueryParams(temp);
    router.replace(path, { search: "" });
  }, []);

  return queryParams;
};
