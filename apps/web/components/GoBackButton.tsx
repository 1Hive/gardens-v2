"use client";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";

export const GoBackButton = () => {
  const router = useRouter();
  const path = usePathname();

  const goBack = () => {
    router.back();
  };

  return (
    <>
      {path === "/gardens" ? null : (
        <Button
          btnStyle="link"
          color="primary"
          onClick={goBack}
          className="ml-8 w-fit px-0 py-0"
          icon={<ArrowLeftIcon className="h-4 w-4" />}
        >
          Back
        </Button>
      )}
    </>
  );
};
