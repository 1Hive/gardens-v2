"use client";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";

export const GoBackButton = () => {
  const router = useRouter();
  const path = usePathname();

  const goBack = () => {
    router.back();

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {path === "/gardens" ? null : (
        <Button
          onClick={goBack}
          className="fixed left-2 top-28 px-4 text-xs"
          icon={<ArrowLeftIcon className="h-4 w-4" />}
        >
          {"Back"}
        </Button>
      )}
    </>
  );
};
