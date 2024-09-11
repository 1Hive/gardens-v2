import React, { useState } from "react";
import { RegistryCommunity } from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { useIsSafe } from "@/hooks/useIsSafe";

type Props = { communityData: Pick<RegistryCommunity, "councilSafe"> };

function CovenantEditButton({ communityData }: Props) {
  const [isModalOpened, setIsModalOpened] = useState(false);
  const { isSafeMemberConnected, shouldSeeSafeButton: shouldSeeCoucilButton } =
    useIsSafe({
      safeAddress: communityData.councilSafe,
    });

  return (
    <>
      {shouldSeeCoucilButton && (
        <>
          <Button
            onClick={() => setIsModalOpened(true)}
            disabled={isSafeMemberConnected}
            btnStyle="outline"
          >
            Edit
          </Button>
          <Modal
            title="Edit covenant"
            isOpen={isModalOpened}
            onClose={() => setIsModalOpened(false)}
          >
            <div>Modal Content</div>
          </Modal>
        </>
      )}
    </>
  );
}

export default CovenantEditButton;
