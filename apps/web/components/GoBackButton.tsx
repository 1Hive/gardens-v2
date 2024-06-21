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
          variant="outline"
          color="error"
          onClick={goBack}
          className="fixed left-2 top-28 z-10 px-4 text-[16px]"
          icon={<ArrowLeftIcon className="h-4 w-4" />}
        >
          {"Back"}
        </Button>
      )}
    </>
  );
};
