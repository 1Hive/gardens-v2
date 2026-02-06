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

    if (pathSegments.length === 4) {
      // case => :empty:/:gardens:/:chaindId:/:communityId:/
      // remove the last two segments
      pathSegments.splice(-2);
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
          className="!w-fit !p-0"
          icon={<ArrowLeftIcon className="h-4 w-4" />}
        >
          Back
        </Button>
      )}
    </>
  );
};
