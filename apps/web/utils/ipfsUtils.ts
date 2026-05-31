import { toast } from "react-toastify";
import { NOTIFICATION_AUTO_CLOSE_DELAY } from "@/globals";

const IPFS_WALLET_HEADER = "x-gardens-wallet-address";
const IPFS_PURPOSE_HEADER = "x-gardens-ipfs-purpose";

type IpfsUploadOptions = {
  toastId?: string;
  walletAddress?: string;
  purpose?: string;
};

const resolveUploadOptions = (
  options?: string | IpfsUploadOptions,
): IpfsUploadOptions => {
  if (typeof options === "string") {
    return { toastId: options };
  }

  return options ?? {};
};

const getIpfsHeaders = (
  options: IpfsUploadOptions,
  contentType?: string,
): HeadersInit => {
  const headers: Record<string, string> = {};

  if (contentType) {
    headers["content-type"] = contentType;
  }

  if (options.walletAddress) {
    headers[IPFS_WALLET_HEADER] = options.walletAddress;
  }

  if (options.purpose) {
    headers[IPFS_PURPOSE_HEADER] = options.purpose;
  }

  return headers;
};

export const ipfsJsonUpload = async (
  payload: string | object,
  options?: string | IpfsUploadOptions,
) => {
  const resolvedOptions = resolveUploadOptions(options);
  const fetchPromise: Promise<string> = fetch("/api/ipfs", {
    method: "POST",
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
    headers: getIpfsHeaders(resolvedOptions, "application/json"),
  }).then(async (res) => {
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.message ?? "Error uploading data to IPFS");
    }

    console.info("Uploaded to: " + json.IpfsHash, {
      payload,
      purpose: resolvedOptions.purpose,
      walletAddress: resolvedOptions.walletAddress,
    });
    return json.IpfsHash;
  });

  return toast
    .promise(fetchPromise, {
      pending: {
        toastId: resolvedOptions.toastId,
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
        toastId: resolvedOptions.toastId,
        render: ({ data }) =>
          data instanceof Error ?
            data.message
          : "Error uploading data, please report a bug.",
        type: "error",
        closeOnClick: true,
        autoClose: NOTIFICATION_AUTO_CLOSE_DELAY,
      },
    })
    .catch((error) => {
      console.error("Error uploading data to IPFS", {
        payload,
        error,
        purpose: resolvedOptions.purpose,
        walletAddress: resolvedOptions.walletAddress,
      });
      return null;
    });
};

export const ipfsFileUpload = async (
  selectedFile: File,
  options?: string | IpfsUploadOptions,
) => {
  const resolvedOptions = resolveUploadOptions(options);
  const data = new FormData();
  data.set("file", selectedFile);
  try {
    const res = await fetch("/api/ipfs", {
      method: "POST",
      body: data,
      headers: getIpfsHeaders(resolvedOptions),
    });
    const json = await res.json();
    if (!res.ok) {
      return await Promise.reject(
        new Error(json?.message ?? "Error uploading file to IPFS"),
      );
    }

    if (json?.IpfsHash) {
      return await Promise.resolve(json.IpfsHash);
    } else {
      return await Promise.reject(json);
    }
  } catch (err) {
    console.error(err);
  }
};

export const fetchIpfs = async <TResult>(
  ipfsHash: string,
  isStringResult?: boolean,
) => {
  const ipfsEndpoint = `/api/ipfs/${ipfsHash}${isStringResult ? "?isText=true" : ""}`;
  const ipfsResult = await fetch(ipfsEndpoint, {
    method: "GET",
    headers: {
      "content-type": "application/json",
    },
  });

  if (!ipfsResult.ok) {
    console.error("Error fetching IPFS data", { ipfsEndpoint });
    return null;
  }

  let result;
  if (isStringResult) {
    result = await ipfsResult.text();
  } else {
    result = await ipfsResult.json();
  }

  return result as TResult;
};
