"use client";

import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components";

export const GoBackButton = () => {
  const router = useRouter();
  const path = usePathname();

  const onBackClicked = () => {
    const pathSegments = path.split("/");
    pathSegments.pop();
    // :empty:/:gardens:/:chaindId:/
    if (pathSegments.length === 3) {
      pathSegments.pop();
    }
    const newPath = pathSegments.join("/");
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
          className="subtitle2 w-fit !p-0"
          icon={<ArrowLeftIcon className="h-4 w-4" />}
        >
          Back
        </Button>
      )}
    </>
  );
};
