import React, { useState } from "react";
import {
  PlusCircleIcon,
  XCircleIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { RegisterOptions, UseFormRegister, FieldErrors } from "react-hook-form";
import { InfoWrapper } from "../InfoWrapper";

type AllowListInputProps = {
  label?: string;
  subLabel?: string;
  registerKey: string;
  placeholder?: string;
  register: UseFormRegister<any>;
  errors: FieldErrors;
  required?: boolean;
  registerOptions?: RegisterOptions;
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
  tooltip?: string;
};

export function AllowListInput({
  label,
  subLabel,
  registerKey,
  placeholder = "Enter Ethereum address",
  register,
  errors,
  required = false,
  registerOptions,
  readOnly,
  disabled,
  className,
  tooltip,
}: AllowListInputProps) {
  const [addresses, setAddresses] = useState<string[]>([]);
  const [newAddress, setNewAddress] = useState("");
  const [bulkAddresses, setBulkAddresses] = useState("");
  const [inputMode, setInputMode] = useState<"single" | "bulk">("single");
  const [error, setError] = useState("");

  const isValidEthereumAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const addAddress = () => {
    if (isValidEthereumAddress(newAddress)) {
      setAddresses([...addresses, newAddress]);
      setNewAddress("");
      setError("");
    } else {
      setError("Invalid Ethereum address format");
    }
  };

  const addBulkAddresses = () => {
    const newAddresses = bulkAddresses
      .split(/[\n,]+/)
      .map((addr) => addr.trim());
    const validAddresses = newAddresses.filter(isValidEthereumAddress);
    const invalidCount = newAddresses.length - validAddresses.length;

    setAddresses([...new Set([...addresses, ...validAddresses])]);
    setBulkAddresses("");

    if (invalidCount > 0) {
      setError(
        `Added ${validAddresses.length} addresses. ${invalidCount} invalid addresses were skipped.`,
      );
    } else {
      setError("");
    }
  };

  const removeAddress = (index: number) => {
    setAddresses(addresses.filter((_, i) => i !== index));
  };

  const exportAddresses = () => {
    const blob = new Blob([addresses.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ethereum_allowlist.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper function to safely get error message as string
  const getErrorMessage = (err: unknown): string => {
    if (typeof err === "string") return err;
    if (
      err &&
      typeof err === "object" &&
      "message" in err &&
      typeof err.message === "string"
    )
      return err.message;
    return "";
  };

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

      <div className="tabs tabs-boxed mb-4">
        <button
          type="button"
          className={`tab ${inputMode === "single" ? "tab-active" : ""}`}
          onClick={() => setInputMode("single")}
        >
          Single Input
        </button>
        <button
          type="button"
          className={`tab ${inputMode === "bulk" ? "tab-active" : ""}`}
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
            placeholder={placeholder}
            className={`input input-bordered input-info w-full max-w-md mr-2 ${className ?? ""}`}
            disabled={disabled ?? readOnly}
            readOnly={readOnly ?? disabled}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={addAddress}
            disabled={disabled ?? readOnly}
          >
            <PlusCircleIcon className="w-5 h-5 mr-2" /> Add
          </button>
        </div>
      : <div className="mb-4">
          <textarea
            value={bulkAddresses}
            onChange={(e) => setBulkAddresses(e.target.value)}
            placeholder="Enter multiple Ethereum addresses \n
            (one per line or comma-separated)"
            className={`textarea textarea-info w-full h-24 mb-2 ${className ?? ""}`}
            disabled={disabled ?? readOnly}
            readOnly={readOnly ?? disabled}
          />
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={addBulkAddresses}
            disabled={disabled ?? readOnly}
          >
            <ArrowUpTrayIcon className="w-5 h-5 mr-2" /> Add Bulk Addresses
          </button>
        </div>
      }

      {error && (
        <div className="alert alert-error mb-4">
          <ExclamationCircleIcon className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Allowlist ({addresses.length} addresses)
        </h3>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={exportAddresses}
          disabled={addresses.length === 0 || (disabled ?? readOnly)}
        >
          <ArrowDownTrayIcon className="w-5 h-5 mr-2" /> Export
        </button>
      </div>

      <ul className="space-y-2 max-h-60 overflow-y-auto">
        {addresses.map((address, index) => (
          <li
            key={`addr_${index}`}
            className="flex items-center justify-between bg-base-200 p-2 rounded"
          >
            <span className="truncate flex-grow mr-2">{address}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => removeAddress(index)}
              disabled={disabled ?? readOnly}
            >
              <XCircleIcon className="w-5 h-5" />
            </button>
          </li>
        ))}
      </ul>

      <input
        type="hidden"
        id={registerKey}
        value={addresses.join(",")}
        {...register(registerKey, {
          required,
          validate: (value) => {
            if (required && value.length === 0) {
              return "At least one address is required";
            }
            return true;
          },
          ...registerOptions,
        })}
      />

      {errors[registerKey] && (
        <p className="text-error mt-2 text-sm font-semibold ml-1">
          {getErrorMessage(errors[registerKey])}
        </p>
      )}
    </div>
  );
}
