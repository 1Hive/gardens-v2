"use client";

import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components";

export const GoBackButton = () => {
  const router = useRouter();
  const path = usePathname();

  const onBackClicked = () => {
    const segments = path.split("/").filter((segment) => segment !== "");
    segments.pop();

    if (segments.length <= 2) {
      router.push("/gardens");
      return;
    }

    const newPath = `/${segments.join("/")}`;
    router.push(newPath);
  };

  return (
    <>
      {path === "/gardens" ? null : (
        <Button
          aria-label="Go back"
          btnStyle="link"
          color="primary"
          onClick={onBackClicked}
          className="!w-fit !p-0"
          icon={<ArrowLeftIcon className="h-4 w-4" />}
        >
          Back
        </Button>
      )}
    </>
  );
};
