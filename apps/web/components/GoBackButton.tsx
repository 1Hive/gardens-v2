"use client";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";

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
          className="w-fit !p-0 subtitle2"
          icon={<ArrowLeftIcon className="h-4 w-4" />}
        >
          Back
        </Button>
      )}
    </>
  );
};
