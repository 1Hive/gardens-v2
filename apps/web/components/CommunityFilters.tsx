import React, { ChangeEvent, useState } from "react";
import { FunnelIcon } from "@heroicons/react/24/outline";
import { ChevronUpIcon } from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "motion/react";
import { FormInput } from "./Forms/FormInput";
import { FormSelect } from "./Forms/FormSelect";

type Option = {
  label: string;
  value: string;
};

type CommunityFiltersProps = {
  nameFilter: string;
  setNameFilter: (value: string) => void;
  tokenFilter: string;
  setTokenFilter: (value: string) => void;
  networkFilter: string;
  setNetworkFilter: (value: string) => void;
  availableTokens: string[];
  availableNetworks: string[];
};

export function CommunityFilters({
  nameFilter,
  setNameFilter,
  tokenFilter,
  setTokenFilter,
  networkFilter,
  setNetworkFilter,
  availableTokens,
  availableNetworks,
}: CommunityFiltersProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const tokenOptions: Option[] = [
    { label: "All Tokens", value: "" },
    ...availableTokens.map((token): Option => ({ label: token, value: token })),
  ];

  const networkOptions: Option[] = [
    { label: "All Networks", value: "" },
    ...availableNetworks.map(
      (network): Option => ({ label: network, value: network }),
    ),
  ];

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setNameFilter(e.target.value);
  };

  const handleTokenChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    setTokenFilter(e.target.value);
  };

  const handleNetworkChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    setNetworkFilter(e.target.value);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center text-secondary-content gap-2"
          aria-label={isExpanded ? "Collapse filters" : "Expand filters"}
        >
          <FunnelIcon
            className="w-5 h-5 text-secondary-content"
            strokeWidth={2}
          />
          <h4 className="text-secondary-content text-lg">Filters</h4>
          <motion.div
            animate={{ rotate: isExpanded ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronUpIcon className="w-5 h-5" strokeWidth={3} />
          </motion.div>
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            // className="overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <FormInput
                  label="Community Name"
                  type="text"
                  value={nameFilter}
                  onChange={handleNameChange}
                  placeholder="Search by name..."
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                <FormSelect
                  label="Token Symbol"
                  registerKey="tokenFilter"
                  options={tokenOptions}
                  value={tokenFilter}
                  onChange={handleTokenChange}
                />
              </div>
              <div className="flex-1">
                <FormSelect
                  label="Network"
                  registerKey="networkFilter"
                  options={networkOptions}
                  value={networkFilter}
                  onChange={handleNetworkChange}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
