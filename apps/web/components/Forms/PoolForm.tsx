"use client";
import React, { useEffect, useState } from "react";
import { PreviewDataRow } from "./PreviewDataRow";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { Address } from "viem";
import { Button } from "@/components/Button";
import { ipfsJsonUpload } from "@/utils/ipfsUpload";

type FormInputs = {
  name: string;
  description: string;
  strategyType: string;
  pointSystemType: string;
};

type PreviewDataRowProps = {
  [x: string]: {
    name: string;
    description: string;
    strategyType: string;
    pointSystemType: string;
  };
};

type FormData = {
  strategyType: string;
  pointSystemType: string;
  metadata: [bigint, string]; // [protocol: bigint, pointer: string]
};

// inputs: [
//   { name: '_strategy', internalType: 'address', type: 'address' },
//   { name: '_token', internalType: 'address', type: 'address' },
//   {
//     name: '_params',
//     internalType: 'struct StrategyStruct.InitializeParams',
//     type: 'tuple',
//     components: [
//       {
//         name: 'registryCommunity',
//         internalType: 'address',
//         type: 'address',
//       },
//       { name: 'decay', internalType: 'uint256', type: 'uint256' },
//       { name: 'maxRatio', internalType: 'uint256', type: 'uint256' },
//       { name: 'weight', internalType: 'uint256', type: 'uint256' },
//       {
//         name: 'proposalType',
//         internalType: 'enum StrategyStruct.ProposalType',
//         type: 'uint8',
//       },
//       {
//         name: 'pointSystem',
//         internalType: 'enum StrategyStruct.PointSystem',
//         type: 'uint8',
//       },
//       {
//         name: 'pointConfig',
//         internalType: 'struct StrategyStruct.PointSystemConfig',
//         type: 'tuple',
//         components: [
//           {
//             name: 'pointsPerTokenStaked',
//             internalType: 'uint256',
//             type: 'uint256',
//           },
//           { name: 'maxAmount', internalType: 'uint256', type: 'uint256' },
//           {
//             name: 'pointsPerMember',
//             internalType: 'uint256',
//             type: 'uint256',
//           },
//           {
//             name: 'tokensPerPoint',
//             internalType: 'uint256',
//             type: 'uint256',
//           },
//         ],
//       },
//     ],
//   },
//   {
//     name: '_metadata',
//     internalType: 'struct Metadata',
//     type: 'tuple',
//     components: [
//       { name: 'protocol', internalType: 'uint256', type: 'uint256' },
//       { name: 'pointer', internalType: 'string', type: 'string' },
//     ],
//   },
// ],

const inputClassname = "input input-bordered input-info w-full";
const labelClassname = "mb-2 text-xs text-secondary";

export default function PoolForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitted },
    getValues,
    setValue,
    reset,
    watch,
  } = useForm<FormInputs>();

  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<any>(null); // preview data
  const [ipfsMetadataHash, setIpfsMetadataHash] = useState<string>(""); // ipfs metadata hash
  const [formData, setFormData] = useState<FormData | undefined>(undefined); // args for contract write

  const handleJsonUpload = () => {
    const json = {
      title: getValues("name"),
      description: getValues("description"),
    };

    const ipfsUpload = ipfsJsonUpload(json);

    toast
      .promise(ipfsUpload, {
        pending: "Uploading to IPFS...",
        success: "Successfully uploaded!",
        error: "Something went wrong",
      })
      .then((data) => {
        console.log("https://ipfs.io/ipfs/" + data);
        setIpfsMetadataHash(data);
      })
      .catch((error: any) => {
        console.error(error);
      });
  };

  const handlePreview = () => {
    handleJsonUpload();

    const data = {
      name: getValues("name"),
      description: getValues("description"),
      isKickMemberEnabled: getValues("strategyType"),
      feeAmount: getValues("pointSystemType"),
    };

    setPreviewData(data);
    setIsEditMode(true);
  };

  const handleInputData: SubmitHandler<FormInputs> = (data: any) => {
    if (!data) {
      console.log("data not provided");
    }

    if (!ipfsMetadataHash) {
      console.log("no metadata provided");
    }

    const metadata = [1n, "ipfs hash"];
    const strategyType = data?.strategyType;
    const pointSystemType = data?.pointSystemType;

    setFormData({
      pointSystemType: pointSystemType,
      strategyType: strategyType,
      metadata: metadata as [bigint, string],
    });
  };

  useEffect(() => {
    if (formData === undefined) return;
    const argsArray = Object.entries(formData).map(([key, value]) => value);
    console.log(argsArray);
    // write?.({ args: [argsArray] });
  }, [formData]);

  return (
    <form onSubmit={handleSubmit(handleInputData)}>
      {!isEditMode ? (
        <div className="flex flex-col space-y-6 overflow-hidden px-1">
          <div className="flex flex-col">
            <label htmlFor="name" className={labelClassname}>
              Pool Name
            </label>
            <input
              type="text"
              placeholder="Pool name..."
              className={inputClassname}
              {...register("name", {
                // required: true,
              })}
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="description" className={labelClassname}>
              Pool description
            </label>
            <input
              type="textarea"
              placeholder="description..."
              className={inputClassname}
              {...register("description", {
                // required: true,
              })}
            />
          </div>

          <label htmlFor="councilSafe" className={labelClassname}>
            Descrition
          </label>
          <textarea
            className="textarea textarea-info line-clamp-5"
            placeholder="Description placeHolder..."
            rows={7}
            // onChange={(e) => setCovenant(e.target.value)}
            // {...register("description", {
            //   // required: true,
            // })}
          ></textarea>

          <div className="flex flex-col">
            <label htmlFor="poolSettings" className={labelClassname}>
              Select pool settings
            </label>
            <input type="radio" name="radio-1" className="radio" checked />
            <input type="radio" name="radio-2" className="radio" />
          </div>

          <div className="flex flex-col">
            <label htmlFor="strategyType" className={labelClassname}>
              Strategy type
            </label>
            <select
              className="select select-accent w-full"
              {...register(
                "strategyType",
                // { required: true }
              )}
            >
              <option value="funding">Funding</option>
              <option value="signaling">Signaling</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label htmlFor="pointSystemType" className={labelClassname}>
              Point system type
            </label>
            <select
              className="select select-accent w-full"
              {...register(
                "pointSystemType",
                // { required: true }
              )}
            >
              <option value="fixed">Fixed</option>
              <option value="limited">Limited</option>
              <option value="capped">Capped</option>
              <option value="quadratic">Quadratic</option>
            </select>
          </div>
        </div>
      ) : (
        <Overview data={previewData} />
      )}

      <div className="flex w-full items-center justify-center py-6">
        {!isEditMode ? (
          <Button type="button" onClick={handlePreview} variant="fill">
            Preview
          </Button>
        ) : (
          <div className="flex items-center gap-10">
            <Button type="submit">Submit</Button>
            <Button
              type="button"
              onClick={() => setIsEditMode(false)}
              variant="fill"
            >
              Edit
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}

const Overview: React.FC<PreviewDataRowProps> = (data) => {
  const { name, description, strategyType, pointSystemType } = data.data;

  return (
    <>
      <div className="px-4 sm:px-0">
        <p className="mt-0 max-w-2xl text-sm leading-6 text-gray-500">
          Check details and covenant description
        </p>
      </div>
      <div>
        {data && (
          <div className="relative">
            <PreviewDataRow label="Pool name" data={name} />
            <PreviewDataRow label="Settings options" data={"options..."} />
            <PreviewDataRow label="Strategy type" data={strategyType} />
            <PreviewDataRow label="Point system type" data={pointSystemType} />
            <h3 className="text-sm font-medium leading-6 text-gray-900">
              Description
            </h3>
            <p className="text-md max-h-56 overflow-y-auto rounded-xl border p-2 leading-7">
              {description}
            </p>
          </div>
        )}
      </div>
    </>
  );
};
