"use client";

import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components";

export const GoBackButton = () => {
  const router = useRouter();
  const path = usePathname();

  return (
    <>
      {path === "/gardens" ? null : (
        <Button
          aria-label="Go back"
          btnStyle="link"
          color="primary"
          onClick={() => router.back()}
          className="subtitle2 w-fit !p-0"
          icon={<ArrowLeftIcon className="h-4 w-4" />}
        >
          Back
        </Button>
      )}
    </>
  );
};
