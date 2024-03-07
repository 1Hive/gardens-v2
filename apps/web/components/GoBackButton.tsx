"use client";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components";
import { ArrowUturnLeftIcon } from "@heroicons/react/24/solid";

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
          className="fixed left-2 top-20 px-8 text-xs"
          icon={<ArrowUturnLeftIcon className="h-4 w-4" />}
        >
          {""}
        </Button>
      )}
    </>
  );
};
