"use client";
import React, { ChangeEvent } from "react";
import { Button } from "./Button";
import { ipfsFileUpload, ipfsJsonUpload } from "@/utils/ipfsUtils";
import { toast } from "react-toastify";

export default function UploadToIpfsSample() {
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFile = e.target.files[0];

    const ipfsUpload = ipfsFileUpload(selectedFile);

    toast
      .promise(ipfsUpload, {
        pending: "Uploading to IPFS...",
        success: "Successfully uploaded!",
        error: "Something went wrong",
      })
      .then((data) => {
        console.log("https://ipfs.io/ipfs/" + data);
        // setIpfsHash(data)
      })
      .catch((error: any) => {
        console.error(error);
      });
  };

  const handleJsonUpload = async () => {
    const sampleJson = {
      imagen: "ipfshash de la imagen",
      descripcion: "sample descripcion",
    };

    const ipfsUpload = ipfsJsonUpload(sampleJson);

    toast
      .promise(ipfsUpload, {
        pending: "Uploading to IPFS...",
        success: "Successfully uploaded!",
        error: "Something went wrong",
      })
      .then((data) => {
        console.log("https://ipfs.io/ipfs/" + data);
      })
      .catch((error: any) => {
        console.error(error);
      });
  };

  return (
    <div className="m-8 flex max-w-[600px] flex-col gap-4">
      <h3>Upload to Ipfs sample component</h3>
      <input
        type="file"
        onChange={handleFileChange}
        className="file-input file-input-bordered w-full max-w-xs"
      />
      <Button onClick={handleJsonUpload}>Upload Sample Json</Button>
    </div>
  );
}
