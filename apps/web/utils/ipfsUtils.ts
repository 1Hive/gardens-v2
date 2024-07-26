import { toast } from "react-toastify";
import { NOTIFICATION_AUTO_CLOSE_DELAY } from "@/globals";

type MetadataV1 = {
  title: string;
  description: string;
};

const ipfsGateway =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "https://ipfs.io/ipfs/";

export const ipfsJsonUpload = async (
  payload: string | object,
  toastId?: string,
) => {
  const fetchPromise = fetch("/api/ipfs", {
    method: "POST",
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
    },
  }).then(async (res) => {
    const json = await res.json();
    console.info("Uploaded to: " + json.IpfsHash, { payload });
    return json.IpfsHash;
  });

  return toast
    .promise(fetchPromise, {
      pending: {
        toastId,
        render: "Uploading data...",
        type: "default",
        closeOnClick: true,
        isLoading: true,
        style: {
          width: "fit-content",
          marginLeft: "auto",
        },
      },
      error: {
        toastId,
        render: "Error uploading data. Please try again.",
        type: "error",
        closeOnClick: true,
        autoClose: NOTIFICATION_AUTO_CLOSE_DELAY,
      },
    })
    .catch((error) => {
      console.error("Error uploading data to IPFS", { payload, error });
      return null;
    });
};

export const ipfsFileUpload = async (selectedFile: File) => {
  const data = new FormData();
  data.set("file", selectedFile);
  try {
    const res = await fetch("/api/ipfs", {
      method: "POST",
      body: data,
    });
    const json = await res.json();
    if (json?.IpfsHash) {
      return await Promise.resolve(json.IpfsHash);
    } else {
      return await Promise.reject(json);
    }
  } catch (err) {
    console.error(err);
  }
};

export const getIpfsMetadata = async (ipfsHash: string) => {
  let title = "No title found";
  let description = "No description found";
  try {
    const rawProposalMetadata = await fetch(`${ipfsGateway}${ipfsHash}`, {
      method: "GET",
      headers: {
        "content-type": "application/json",
      },
    });

    const proposalMetadata: MetadataV1 = await rawProposalMetadata.json();
    if (title) title = proposalMetadata?.title;
    if (description) description = proposalMetadata?.description;
  } catch (error) {
    console.error(error);
  }
  return { title: title, description: description };
};
