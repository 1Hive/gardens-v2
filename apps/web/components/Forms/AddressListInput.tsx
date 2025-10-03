import React, { KeyboardEventHandler, useEffect, useState } from "react";
import {
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  InformationCircleIcon,
  TrashIcon,
  XMarkIcon,
  PlusIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { getPublicClient } from "@wagmi/core";
import { blo } from "blo";
import {
  RegisterOptions,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { Address, ContractFunctionConfig, namehash, zeroAddress } from "viem";
import { normalize } from "viem/ens";
import { mainnet } from "wagmi";
import { FormAddressInput } from "./FormAddressInput";
import { Button } from "../Button";
import { InfoWrapper } from "../InfoWrapper";
import { useConfig } from "@/hooks/useCheat";
import { PointSystems } from "@/types";
import { isENS } from "@/utils/web3";

type AddressListInputProps = {
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
  pointSystemType: number;
};

export function AddressListInput({
  label,
  subLabel,
  registerKey,
  placeholder = "Enter Ethereum address",
  addresses: initialAddresses,
  register,
  setValue,
  required = false,
  registerOptions,
  className,
  tooltip,
  pointSystemType,
}: AddressListInputProps) {
  const [addresses, setAddresses] = useState<Address[]>(
    Array.isArray(initialAddresses) ? initialAddresses : [],
  );
  const [newAddress, setNewAddress] = useState("");
  const [bulkAddresses, setBulkAddresses] = useState("");
  const [inputMode, setInputMode] = useState<"single" | "bulk">("single");
  const [errorMessage, setErrorMessage] = useState("");
  const [ensLoading, setEnsLoading] = useState(false);
  const allowNoProtectionCheat = useConfig("allowNoProtection");

  const allowNoProtection =
    PointSystems[pointSystemType] === "unlimited" || allowNoProtectionCheat;

  const isValidEthereumAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const exportAddresses = () => {
    const csvContent = addresses.join(",");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${registerKey}_addresslist.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const addAddresses = async (newAddressesInput: string) => {
    const newAddresses = newAddressesInput
      .split(/[\n,]+/)
      .map((addr) => addr.trim());

    const ensAddresses = newAddresses.flatMap((value, idx) =>
      isENS(value) ? [{ index: idx, name: normalize(value) }] : [],
    );

    if (ensAddresses.length) {
      setEnsLoading(true);

      const client = getPublicClient({ chainId: mainnet.id });
      const ENS_REGISTRY = mainnet.contracts.ensRegistry.address as Address;

      const resolverCalls: ContractFunctionConfig[] = ensAddresses.map(
        ({ name }) => ({
          address: ENS_REGISTRY,
          functionName: "resolver",
          args: [namehash(name)],
          abi: [
            {
              name: "resolver",
              type: "function",
              stateMutability: "view",
              inputs: [{ name: "node", type: "bytes32" }],
              outputs: [{ type: "address" }],
            },
          ],
        }),
      );

      const resolverResults = await client.multicall({
        contracts: resolverCalls,
      });

      type AddrMeta = { slot: number; contract: ContractFunctionConfig };

      const addrMeta: AddrMeta[] = resolverResults.flatMap((r, i) => {
        if (r.status !== "success") return [];
        const resolverAddr = r.result as Address;

        const { name, index: slot } = ensAddresses[i];

        return [
          {
            slot,
            contract: {
              address: resolverAddr,
              functionName: "addr",
              args: [namehash(name)],
              abi: [
                {
                  name: "addr",
                  type: "function",
                  stateMutability: "view",
                  inputs: [{ name: "node", type: "bytes32" }],
                  outputs: [{ type: "address" }],
                },
              ],
            } as const,
          },
        ];
      });

      const addrResults = await client.multicall({
        contracts: addrMeta.map((m) => m.contract),
      });

      await Promise.all(
        addrResults.map(async (res, i) => {
          const { slot } = addrMeta[i];

          if (res.status === "success" && res.result !== zeroAddress) {
            newAddresses[slot] = res.result as Address;
          } else {
            // Try resolve with universal resolver
            const name = ensAddresses[addrMeta[i].slot].name;
            const resolved = await client.getEnsAddress({
              name,
            });
            if (resolved) {
              newAddresses[slot] = resolved;
            } else {
              if (res.status === "failure") {
                console.error(`ENS resolution failed for: ${name}`, res.error);
              }
            }
          }
        }),
      );
    }

    const validNewAddresses = newAddresses.filter(
      isValidEthereumAddress,
    ) as Address[];

    let updatedAddresses = [...new Set([...addresses, ...validNewAddresses])];
    updatedAddresses = updatedAddresses.filter((addr) => addr !== zeroAddress);
    const addedAddressesCount = updatedAddresses.length - addresses.length;

    setAddresses(updatedAddresses as Address[]);
    setValue(registerKey, updatedAddresses); // Update form value
    setNewAddress("");
    const invalidAddresses = newAddresses.filter(
      (x) => !validNewAddresses.includes(x as Address),
    );
    setBulkAddresses(invalidAddresses.join("\n"));

    if (
      newAddresses.length > 0 &&
      newAddresses.length !== addedAddressesCount &&
      addresses[0] !== zeroAddress
    ) {
      setErrorMessage(
        `Added ${addedAddressesCount} address${addedAddressesCount !== 1 ? "es" : ""}. Invalid or repeated addresses were skipped.`,
      );
    } else {
      setErrorMessage("");
    }

    setEnsLoading(false);
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

  const handleAllowEveryone = () => {
    setAddresses([zeroAddress]);
    setValue(registerKey, [zeroAddress]); // Update form value
  };

  useEffect(() => {
    register(registerKey, { ...registerOptions, required });
  }, [register, registerKey, registerOptions, required]);

  const handleSubmit: KeyboardEventHandler<HTMLTextAreaElement> = (ev) => {
    // Ctrl+Enter should call addAddresses(bulkAddresses)
    if (ev.ctrlKey && ev.key === "Enter") {
      ev.preventDefault();
      addAddresses(bulkAddresses);
    }
  };

  return (
    <div className="flex flex-col max-w-[29rem]">
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
        className={`mb-4 flex gap-1 rounded-xl bg-neutral-soft p-1 text-neutral-content dark:bg-[#1f1f1f] dark:text-neutral-soft-content ${
          !label && "mt-4"
        }`}
      >
        <button
          type="button"
          className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold transition-colors ${
            inputMode === "single" ?
              "bg-neutral text-neutral-content shadow-sm dark:bg-[#2c2c2c] dark:text-white"
            : "text-neutral-soft-content hover:bg-neutral/60 dark:text-neutral-soft-2"
          }`}
          onClick={() => setInputMode("single")}
        >
          Single Input
        </button>
        <button
          type="button"
          className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold transition-colors ${
            inputMode === "bulk" ?
              "bg-neutral text-neutral-content shadow-sm dark:bg-[#2c2c2c] dark:text-white"
            : "text-neutral-soft-content hover:bg-neutral/60 dark:text-neutral-soft-2"
          }`}
          onClick={() => setInputMode("bulk")}
        >
          Bulk Input
        </button>
      </div>
      {inputMode === "single" ?
        <div
          className="flex mb-4 gap-2"
          onKeyUp={(e) => {
            if (e.key === "Enter") {
              addAddresses(newAddress);
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          <FormAddressInput
            placeholder={placeholder}
            required={required && addresses.length === 0}
            onChange={(e) => setNewAddress(e.target.value)}
            value={newAddress}
            className="!w-[29rem]"
          />
          <Button
            type="button"
            btnStyle="outline"
            className="!py-3 !px-4 flex items-center"
            onClick={() => addAddresses(newAddress)}
            tooltip="Add"
          >
            <PlusIcon className="w-5 h-5" />
          </Button>
        </div>
      : <div className="mb-4 flex flex-col justify-end">
          <textarea
            value={bulkAddresses}
            required={required && addresses.length === 0}
            onChange={(e) => setBulkAddresses(e.target.value)}
            placeholder={`Enter multiple Ethereum addresses 
(one per line or comma-separated)`}
            className={`textarea textarea-info dark:bg-primary-soft-dark w-full h-24 mb-2 ${
              className ?? ""
            }`}
            onKeyDown={handleSubmit}
          />
          <Button
            type="button"
            btnStyle="filled"
            className=""
            onClick={() => addAddresses(bulkAddresses)}
            disabled={!bulkAddresses.trim()}
            tooltip="Add Bulk Addresses"
            isLoading={ensLoading}
          >
            <ArrowUpTrayIcon className="w-5 h-5 stroke-2" /> Add Bulk Addresses
          </Button>
        </div>
      }

      {errorMessage && (
        <div className="text-error flex items-center gap-2 my-2 [&>svg]:stroke-2">
          <InformationCircleIcon width={22} height={22} />
          <span className="text-sm font-semibold">{errorMessage}</span>
        </div>
      )}

      <div className="flex justify-between items-center my-3">
        <label className="font-semibold">
          List (
          {addresses?.[0] === zeroAddress ?
            "All"
          : `${addresses.length} address${addresses.length !== 1 ? "es" : ""}`}
          )
        </label>
        <div className="flex gap-2 items-center">
          <Button
            type="button"
            btnStyle="outline"
            className={"font-normal text-[14px] leading-4"}
            onClick={handleAllowEveryone}
            disabled={!allowNoProtection}
            icon={<UserGroupIcon className="w-4 h-4" />}
            tooltip={
              !allowNoProtection ?
                "Only unlimited points system pools\n can allow everyone"
              : "Allow everyone in the pool"
            }
          >
            Everyone
          </Button>
          <Button
            type="button"
            btnStyle="outline"
            color="danger"
            onClick={clearAllAddresses}
            forceShowTooltip
            tooltip="Clear All"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            btnStyle="outline"
            onClick={exportAddresses}
            forceShowTooltip
            tooltip="Export"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {addresses.length > 0 && (
        <ul className="space-y-2 max-h-60 overflow-y-auto border1 p-2 rounded-xl">
          {addresses.map((address, index) => (
            <li
              // eslint-disable-next-line react/no-array-index-key
              key={`addr_${index}`}
              className="flex items-center justify-between bg-base-200 rounded text-neutral-content dark:text-neutral-soft-content"
            >
              <div className="truncate flex-grow text-sm font-medium">
                {address === zeroAddress ?
                  "Everyone is allowed in the pool."
                : <div className="font-mono flex items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt=""
                      className={"!rounded-full mr-2"}
                      src={blo(address)}
                      width="24"
                      height="24"
                    />
                    {address}
                  </div>
                }
              </div>
              {address !== zeroAddress && (
                <Button
                  type="button"
                  btnStyle="link"
                  color="danger"
                  className="!p-[2px]"
                  onClick={() => removeAddress(index)}
                >
                  <XMarkIcon className="w-5 h-5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
