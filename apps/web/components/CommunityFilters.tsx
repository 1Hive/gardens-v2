import React, { ChangeEvent, useState } from "react";
import { FunnelIcon } from "@heroicons/react/24/outline";
import { ChevronUpIcon } from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "motion/react";
import { FormInput } from "./Forms/FormInput";
import { FormSelect } from "./Forms/FormSelect";
import { chainConfigMap, ChainIcon } from "@/configs/chains";
import { isProd } from "@/configs/isProd";

type Option = {
  label: string;
  value: string;
  icon?: React.ReactNode;
};

type CommunityFiltersProps = {
  searchFilter: string;
  setSearchFilter: (value: string) => void;
  tokenFilter: string;
  setTokenFilter: (value: string) => void;
  chainIdFilter: string;
  setchainIdFilter: (value: string) => void;
  availableTokens: string[];
};

export function CommunityFilters({
  searchFilter,
  setSearchFilter,
  tokenFilter,
  setTokenFilter,
  chainIdFilter,
  setchainIdFilter,
  availableTokens,
}: CommunityFiltersProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const availableNetworks = Object.entries(chainConfigMap)
    .filter(([_, chainConfig]) => !isProd || !chainConfig.isTestnet)
    .map(([chainId, chainConfig]) => ({
      name: chainConfig.name,
      chainId: chainId,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const tokenOptions: Option[] = [
    { label: "All Governance Tokens", value: "" },
    ...availableTokens.map((token): Option => ({ label: token, value: token })),
  ];

  const networkOptions: Option[] = [
    {
      label: "All Chains",
      value: "",
      icon: null,
    },
    ...availableNetworks.map(
      (network): Option => ({
        label: network.name,
        value: network.chainId,
        icon: <ChainIcon chain={network.chainId} height={20} />,
      }),
    ),
  ];

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    // router.push(pathWithQuery("search", value || null));
    setSearchFilter(value);
  };

  const handleTokenChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const value = e.target.value;
    // router.push(pathWithQuery("token", value || null));
    setTokenFilter(value);
  };

  const handleNetworkChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const value = e.target.value;
    // router.push(pathWithQuery("chainId", value || null));
    setchainIdFilter(value);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center text-tertiary-content gap-1"
          aria-label={isExpanded ? "Collapse filters" : "Expand filters"}
        >
          <FunnelIcon
            className="w-6 h-6 text-tertiary-content"
            strokeWidth={2}
          />
          <motion.div
            animate={{ rotate: isExpanded ? 0 : 180 }}
            transition={{ duration: 0.3 }}
            className="sm:hidden"
          >
            <ChevronUpIcon className="w-5 h-5" strokeWidth={3} />
          </motion.div>
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, height: 0, width: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
              <div className="flex-1 w-full">
                <FormInput
                  // label="Search"
                  type="text"
                  value={searchFilter}
                  onChange={handleNameChange}
                  placeholder="Search"
                  className="w-full h-10"
                />
              </div>
              <div className="flex-1 w-full">
                <FormSelect
                  // label="Governance Token"
                  registerKey="tokenFilter"
                  options={tokenOptions}
                  value={tokenFilter}
                  onChange={handleTokenChange}
                  className="h-10 min-h-10"
                />
              </div>
              <div className="flex-1 w-full">
                <FormSelect
                  // label="Network"
                  registerKey="chainIdFilter"
                  options={networkOptions}
                  value={chainIdFilter}
                  onChange={handleNetworkChange}
                  className="h-10 min-h-10"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
