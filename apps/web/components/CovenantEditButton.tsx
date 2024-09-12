import React, { useEffect, useState } from "react";
import MarkdownEditor from "@uiw/react-md-editor";
import { RegistryCommunity } from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { FormInput } from "./Forms";
import { InfoBox } from "./InfoBox";
import { Modal } from "./Modal";
import { DEFAULT_RULING_TIMEOUT_SEC } from "@/configs/constants";
import { useIpfsFetch } from "@/hooks/useIpfsFetch";
import { useIsSafe } from "@/hooks/useIsSafe";
import { convertSecondsToReadableTime } from "@/utils/numbers";

type Props = {
  communityData: Pick<
    RegistryCommunity,
    "councilSafe" | "covenantIpfsHash" | "communityName"
  >;
};

function CovenantEditButton({ communityData }: Props) {
  const [covenant, setCovenant] = useState<string>();
  const [isModalOpened, setIsModalOpened] = useState(false);
  const { isSafeMemberConnected, shouldSeeSafeButton: shouldSeeCoucilButton } =
    useIsSafe({
      safeAddress: communityData.councilSafe,
    });

  const existingCovenant = useIpfsFetch<{ covenant: string }>({
    hash: communityData.covenantIpfsHash,
  });

  useEffect(() => {
    if (existingCovenant.data) {
      setCovenant(existingCovenant.data.covenant);
    }
  }, [existingCovenant.data]);

  const rulingTimeout = convertSecondsToReadableTime(
    DEFAULT_RULING_TIMEOUT_SEC,
  );

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
            title={"Edit covenant: " + communityData.communityName}
            isOpen={isModalOpened}
            onClose={() => setIsModalOpened(false)}
            className="md:*:w-2/3"
          >
            <FormInput
              id="covenant"
              type="markdown"
              value={covenant}
              onChange={(newValue) => setCovenant(newValue)}
              placeholder="Covenant description..."
              className="textarea textarea-accent w-full mb-4"
              rows={10}
            />
            <InfoBox infoBoxType="info">
              The covenant will be submited to a community validation period of
              {` ${rulingTimeout.value} ${rulingTimeout.unit}`} during which any
              community member can dispute it.
            </InfoBox>
            <div className="modal-action">
              <Button
                onClick={() => setIsModalOpened(false)}
                btnStyle="outline"
              >
                Cancel
              </Button>
              <Button onClick={() => setIsModalOpened(false)} btnStyle="filled">
                Save
              </Button>
            </div>
          </Modal>
        </>
      )}
    </>
  );
}

export default CovenantEditButton;
