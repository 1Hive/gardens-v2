import React, { useEffect, useState } from "react";
import {
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  InformationCircleIcon,
  TrashIcon,
  XMarkIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import {
  RegisterOptions,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { Address } from "viem";
import { Button } from "../Button";
import { InfoWrapper } from "../InfoWrapper";

type AllowListInputProps = {
  label?: string;
  subLabel?: string;
  registerKey: string;
  placeholder?: string;
  addresses?: Address[] | number;
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  errors: any;
  required?: boolean;
  registerOptions?: RegisterOptions;
  className?: string;
  tooltip?: string;
};

export const exportAddresses = (addresses: string[]) => {
  const csvContent = addresses.join(",");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "pool_allowlist.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export function AllowListInput({
  label,
  subLabel,
  registerKey,
  placeholder = "Enter Ethereum address",
  addresses: initialAddresses,
  register,
  setValue,
  errors,
  required = false,
  registerOptions,
  className,
  tooltip,
}: AllowListInputProps) {
  const [addresses, setAddresses] = useState<string[]>(
    Array.isArray(initialAddresses) ? initialAddresses : [],
  );
  const [newAddress, setNewAddress] = useState("");
  const [bulkAddresses, setBulkAddresses] = useState("");
  const [inputMode, setInputMode] = useState<"single" | "bulk">("single");
  const [errorMessage, setErrorMessage] = useState("");

  const isValidEthereumAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const addAddresses = (newAddressesInput: string) => {
    const newAddresses = newAddressesInput
      .split(/[\n,]+/)
      .map((addr) => addr.trim());
    const validNewAddresses = newAddresses.filter(isValidEthereumAddress);
    const updatedAddresses = [...new Set([...addresses, ...validNewAddresses])];

    const addedAddressesCount = updatedAddresses.length - addresses.length;

    setAddresses(updatedAddresses);
    setValue(registerKey, updatedAddresses); // Update form value
    setNewAddress("");
    setBulkAddresses("");

    if (
      newAddresses.length > 0 &&
      newAddresses.length !== addedAddressesCount
    ) {
      setErrorMessage(
        `Added ${addedAddressesCount} address${addedAddressesCount !== 1 ? "es" : ""}. Invalid or repeated addresses were skipped.`,
      );
    } else {
      setErrorMessage("");
    }
  };

  const removeAddress = (index: number) => {
    const updatedAddresses = addresses.filter((_, i) => i !== index);
    setAddresses(updatedAddresses);
    setValue(registerKey, updatedAddresses); // Update form value
  };

  const clearAllAddresses = () => {
    setAddresses([]);
    setValue(registerKey, []); // Update form value
    setErrorMessage("");
  };

  useEffect(() => {
    register(registerKey, { ...registerOptions, required });
  }, [register, registerKey, registerOptions, required]);

  useEffect(() => {
    if (errors[registerKey] && addresses.length === 0) {
      setErrorMessage("At least one address is required");
    } else {
      setErrorMessage("");
    }
  }, [errors, registerKey, addresses.length]);

  return (
    <div className="flex flex-col max-w-md">
      {label && (
        <label htmlFor={registerKey} className="label cursor-pointer w-fit">
          {tooltip ?
            <InfoWrapper tooltip={tooltip}>
              {label}
              {required && <span className="ml-1">*</span>}
            </InfoWrapper>
          : <>
              {label}
              {required && <span className="ml-1">*</span>}
            </>
          }
        </label>
      )}
      {subLabel && <p className="mb-1 text-xs">{subLabel}</p>}

      <div
        className={`rounded-lg flex mb-4 border p-0 text-neutral-soft-content ${
          !label && "mt-4"
        }`}
      >
        <button
          type="button"
          className={`w-full py-2 rounded-lg text-center px-4 ${
            inputMode === "single" ?
              "border border-secondary-content bg-secondary-soft text-black -m-[1px]"
            : ""
          }`}
          onClick={() => setInputMode("single")}
        >
          Single Input
        </button>
        <button
          type="button"
          className={`w-full py-2 rounded-lg text-center px-4 ${
            inputMode === "bulk" ?
              "border border-secondary-content bg-secondary-soft text-black -m-[1px]"
            : ""
          }`}
          onClick={() => setInputMode("bulk")}
        >
          Bulk Input
        </button>
      </div>

      {inputMode === "single" ?
        <div className="flex mb-4">
          <input
            type="text"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            required={required && addresses.length === 0}
            placeholder={placeholder}
            className={`input input-bordered input-info w-full max-w-md mr-2 ${
              className ?? ""
            }`}
          />
          <Button
            type="button"
            btnStyle="outline"
            className="!py-3 !px-4 flex items-center"
            onClick={() => addAddresses(newAddress)}
          >
            <PlusIcon className="w-5 h-5 mr-2" /> Add
          </Button>
        </div>
      : <div className="mb-4">
          <textarea
            value={bulkAddresses}
            required={required && addresses.length === 0}
            onChange={(e) => setBulkAddresses(e.target.value)}
            placeholder={`Enter multiple Ethereum addresses 
(one per line or comma-separated)`}
            className={`textarea textarea-info w-full h-24 mb-2 ${
              className ?? ""
            }`}
          />
          <Button
            type="button"
            btnStyle="outline"
            className=""
            onClick={() => addAddresses(bulkAddresses)}
          >
            <ArrowUpTrayIcon className="w-5 h-5 mr-2 stroke-2" /> Add Bulk
            Addresses
          </Button>
        </div>
      }

      {errorMessage && (
        <div className="text-error flex items-center gap-2 my-2 [&>svg]:stroke-2">
          <InformationCircleIcon width={22} height={22} />
          <span className="text-sm font-semibold">{errorMessage}</span>
        </div>
      )}

      {addresses.length > 0 && (
        <>
          <div className="flex justify-between items-center my-3">
            <h3 className="text-lg font-medium">
              Allowlist ({addresses.length} addresses)
            </h3>
            <div className="flex space-x-1">
              <Button
                type="button"
                btnStyle="outline"
                className="!p-2 !text-black !border-black"
                onClick={clearAllAddresses}
                tooltip="Clear All"
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                btnStyle="outline"
                className="!p-2"
                onClick={() => exportAddresses(addresses)}
                tooltip="Export"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <ul className="space-y-2 max-h-60 overflow-y-auto border1 p-2 rounded-xl">
            {addresses.map((address, index) => (
              <li
                key={`addr_${index}`}
                className="flex items-center justify-between bg-base-200 rounded"
              >
                <span className="truncate flex-grow mr-2 text-sm text-medium">
                  {address}
                </span>
                <Button
                  type="button"
                  btnStyle="outline"
                  className="!p-[2px] !text-black !border-black"
                  onClick={() => removeAddress(index)}
                >
                  <XMarkIcon className="w-5 h-5" />
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}