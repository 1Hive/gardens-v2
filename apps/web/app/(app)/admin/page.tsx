"use client";

import React, { useMemo, useState } from "react";
import { Address, isAddress } from "viem";
import { useContractRead } from "wagmi";
import { Button } from "@/components/Button";
import { InfoBox } from "@/components/InfoBox";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { CHAINS } from "@/configs/chains";
import { shortenAddress } from "@/utils/text";

type DiamondFacet = {
  facetAddress: Address;
  functionSelectors: string[];
};

export default function DiamondAdminPage() {
  const [addressInput, setAddressInput] = useState("");
  const [diamondAddress, setDiamondAddress] = useState<Address>();
  const [selectedChainId, setSelectedChainId] = useState<number>(
    CHAINS[0]?.id ?? 42161,
  );

  const isAddressValid = Boolean(addressInput) && isAddress(addressInput);

  const {
    data: rawFacets,
    isFetching,
    isError,
    error,
    refetch,
  } = useContractRead({
    address: diamondAddress,
    abi: [
      {
        inputs: [],
        name: "getFacets",
        outputs: [
          {
            components: [
              {
                internalType: "address",
                name: "facetAddress",
                type: "address",
              },
              {
                internalType: "bytes4[]",
                name: "functionSelectors",
                type: "bytes4[]",
              },
            ],
            internalType: "struct IDiamondLoupe.Facet[]",
            name: "facets_",
            type: "tuple[]",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "getFacets",
    enabled: Boolean(diamondAddress),
    chainId: selectedChainId,
  });

  const facets = (rawFacets as DiamondFacet[] | undefined) ?? [];
  const totalSelectors = useMemo(
    () =>
      facets.reduce(
        (count, facet) => count + (facet?.functionSelectors?.length ?? 0),
        0,
      ),
    [facets],
  );

  const selectedChain = CHAINS.find((entry) => entry.id === selectedChainId);

  const handleInspectClick = () => {
    if (!isAddressValid) return;
    const normalized = addressInput as Address;
    if (diamondAddress === normalized) {
      refetch?.();
      return;
    }
    setDiamondAddress(normalized);
  };

  return (
    <div className="space-y-8 px-4 py-8">
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary-content/80">
          Admin tools
        </p>
        <h1 className="text-2xl font-semibold text-neutral-content">
          Diamond facet diagnostics
        </h1>
        <p className="text-sm text-neutral-muted">
          Inspect any diamond contract to understand which facets are registered
          and how many selectors each facet exposes.
        </p>
      </section>

      <section className="space-y-4">
        <div className="grid gap-4 rounded-2xl border border-border-neutral bg-neutral/10 p-4 md:grid-cols-[1.5fr_1fr_160px]">
          <label className="flex flex-col gap-2 text-sm text-neutral-muted">
            <span>Chain</span>
            <select
              className="rounded-lg border border-border-neutral bg-neutral px-3 py-2 text-sm text-neutral-content focus:border-primary-content focus:outline-none focus:ring-1 focus:ring-primary-content"
              value={selectedChainId}
              onChange={(event) => {
                const nextId = Number(event.target.value);
                if (!Number.isNaN(nextId)) {
                  setSelectedChainId(nextId);
                }
              }}
            >
              {CHAINS.map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.name} ({chain.id})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-neutral-muted">
            <span>Diamond address</span>
            <input
              className="rounded-lg border border-border-neutral bg-neutral px-3 py-2 text-sm text-neutral-content placeholder:text-neutral-muted focus:border-primary-content focus:outline-none focus:ring-1 focus:ring-primary-content"
              placeholder="0x..."
              value={addressInput}
              onChange={(event) => setAddressInput(event.target.value)}
            />
            {addressInput && !isAddressValid && (
              <span className="text-xs text-danger-content">
                Provide a valid Ethereum address.
              </span>
            )}
          </label>

          <div className="flex items-end justify-end">
            <Button
              btnStyle="filled"
              color="primary"
              onClick={handleInspectClick}
              disabled={!isAddressValid}
              className="w-full"
            >
              Inspect facets
            </Button>
          </div>
        </div>

        {isError && (
          <InfoBox infoBoxType="error" title="Unable to read facets">
            {error?.message ?
              error?.message
                .split("\n")
                .map((line, idx) => <p key={idx}>{line}</p>)
            : "The diamond does not expose loupe data."}
          </InfoBox>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border-neutral bg-neutral/10 p-4">
          <div>
            <p className="text-sm text-neutral-muted">Currently probing</p>
            <p className="text-base font-mono text-primary-content">
              {diamondAddress ?
                shortenAddress(diamondAddress)
              : "No diamond yet"}
            </p>
          </div>
          <div className="space-y-1 text-right text-xs text-neutral-muted">
            <p>Chain</p>
            <p className="text-sm text-neutral-content">
              {selectedChain?.name ?? "Unknown"} ({selectedChainId})
            </p>
          </div>
          <div className="space-y-1 text-right text-xs text-neutral-muted">
            <p>Facets</p>
            <p className="text-sm text-neutral-content">
              {facets.length.toLocaleString("en-US")}
            </p>
          </div>
          <div className="space-y-1 text-right text-xs text-neutral-muted">
            <p>Function selectors</p>
            <p className="text-sm text-neutral-content">
              {totalSelectors.toLocaleString("en-US")}
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border-neutral bg-neutral/5 p-4">
          {isFetching && !facets.length ?
            <LoadingSpinner className="py-10" size="loading-lg" />
          : <>
              {!diamondAddress && (
                <InfoBox
                  infoBoxType="info"
                  title="Start with a diamond address"
                >
                  Choose a chain and provide the diamond contract you want to
                  investigate. We will call the loupe facet to report every
                  facet currently registered.
                </InfoBox>
              )}

              {diamondAddress && !facets.length && !isFetching && (
                <InfoBox
                  infoBoxType="warning"
                  title="No facets returned"
                  content="The diamond returned an empty facet array."
                />
              )}

              {facets.length > 0 && (
                <div className="space-y-3">
                  {facets.map((facet, index) => (
                    <div
                      key={`${facet.facetAddress}-${index}`}
                      className="rounded-xl border border-border-neutral/40 bg-neutral/50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-neutral-muted">
                            Facet #{index + 1}
                          </p>
                          <p className="font-mono text-sm text-neutral-content">
                            {shortenAddress(facet.facetAddress)}
                          </p>
                        </div>
                        <p className="text-xs text-neutral-muted">
                          {facet.functionSelectors.length} selectors
                        </p>
                      </div>
                      {facet.functionSelectors.length > 0 ?
                        <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                          {facet.functionSelectors.map((selector) => (
                            <code
                              key={selector}
                              className="rounded border border-border-neutral/50 bg-neutral/30 px-2 py-1 font-mono text-xs text-primary-content"
                            >
                              {selector}
                            </code>
                          ))}
                        </div>
                      : <p className="mt-3 text-xs text-neutral-muted">
                          No selectors registered for this facet.
                        </p>
                      }
                    </div>
                  ))}
                </div>
              )}
            </>
          }
        </div>
      </section>
    </div>
  );
}
