"use client";

import React, { useEffect, useState } from "react";
import { FunnelIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "motion/react";
import {
  CVStrategy,
  Maybe,
  MemberCommunity,
  RegistryCommunity,
  TokenGarden,
} from "#/subgraph/.graphclient";

export type LightCommunity = Pick<RegistryCommunity, "id" | "communityName"> & {
  garden: Pick<TokenGarden, "address" | "chainId" | "symbol" | "name">;
  strategies?: Maybe<
    Array<
      Pick<
        CVStrategy,
        "id" | "totalEffectiveActivePoints" | "poolId" | "poolAmount"
      >
    >
  >;
  members?: Maybe<Array<Pick<MemberCommunity, "id" | "memberAddress">>>;
};

export type Filters = {
  network: number | null;
  token: string | null;
  name: string | null;
};

type CommunitiesFilterProps = {
  communities: LightCommunity[];
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
};

export const CommunitiesFilter: React.FC<CommunitiesFilterProps> = ({
  communities,
  filters,
  setFilters,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.name || "");

  // For filter options (derived from communities)
  const [networkOptions, setNetworkOptions] = useState<
    { id: number; name: string }[]
  >([]);
  const [tokenOptions, setTokenOptions] = useState<string[]>([]);

  useEffect(() => {
    // Extract unique networks and tokens for filter options
    const uniqueGardens = new Map();
    communities.forEach((c) => {
      if (!uniqueGardens.has(c.garden.chainId)) {
        uniqueGardens.set(c.garden.chainId, {
          id: c.garden.chainId,
          name: c.garden.name,
        });
      }
    });

    const networks = Array.from(uniqueGardens.values());
    const tokens = Array.from(new Set(communities.map((c) => c.garden.symbol)));

    setNetworkOptions(networks);
    setTokenOptions(tokens);
  }, [communities]);

  // Update searchInput if filters.name changes externally
  useEffect(() => {
    if (filters.name !== null) {
      setSearchInput(filters.name);
    } else {
      setSearchInput("");
    }
  }, [filters.name]);

  function clearAllFilters() {
    setFilters({
      network: null,
      token: null,
      name: null,
    });
    setSearchInput("");
  }

  const applyNameFilter = (value: string) => {
    setSearchInput(value);
    setFilters((prev) => ({
      ...prev,
      name: value.length > 0 ? value : null,
    }));
  };

  const activeFilterCount = Object.values(filters).filter(
    (f) => f !== null,
  ).length;
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="w-full mb-4">
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 text-secondary-content"
        >
          <FunnelIcon className="w-5 h-5" />
          <span>Filter Communities</span>
          {hasActiveFilters && (
            <div className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
              {activeFilterCount}
            </div>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-secondary-content text-sm flex items-center gap-1"
          >
            <XMarkIcon className="w-4 h-4" />
            Clear filters
          </button>
        )}
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden bg-neutral-soft rounded-lg p-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Network Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Garden</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={
                    filters.network !== null ? filters.network.toString() : ""
                  }
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      network: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                >
                  <option value="">All Gardens</option>
                  {networkOptions.map((network) => (
                    <option key={network.id} value={network.id}>
                      {network.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Token Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Token</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={filters.token || ""}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      token: e.target.value || null,
                    }))
                  }
                >
                  <option value="">All Tokens</option>
                  {tokenOptions.map((token) => (
                    <option key={token} value={token}>
                      {token}
                    </option>
                  ))}
                </select>
              </div>

              {/* Community Name Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Community Name
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-md"
                  placeholder="Search communities..."
                  value={searchInput}
                  onChange={(e) => applyNameFilter(e.target.value)}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
