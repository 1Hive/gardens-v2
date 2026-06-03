// wagmi.config.ts
import { defineConfig } from "@wagmi/cli";
import { actions } from "@wagmi/cli/plugins";

// ../../pkg/contracts/abis/DiamondAggregated/CVStrategy.json
var abi = [
  {
    type: "fallback",
    stateMutability: "payable"
  },
  {
    type: "receive",
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "DISPUTE_COOLDOWN_SEC",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "NATIVE",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "RULING_OPTIONS",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "activatePoints",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "allocate",
    inputs: [
      {
        name: "",
        type: "bytes",
        internalType: "bytes"
      },
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "arbitrableConfigs",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "arbitrator",
        type: "address",
        internalType: "contract IArbitrator"
      },
      {
        name: "tribunalSafe",
        type: "address",
        internalType: "address"
      },
      {
        name: "submitterCollateralAmount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "challengerCollateralAmount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "defaultRuling",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "defaultRulingTimeout",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "calculateProposalConviction",
    inputs: [
      {
        name: "_proposalId",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "calculateThreshold",
    inputs: [
      {
        name: "_requestedAmount",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "cancelProposal",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "cloneNonce",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "collateralVault",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract ICollateralVault"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "connectSuperfluidGDA",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "currentArbitrableConfigVersion",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "cvParams",
    inputs: [],
    outputs: [
      {
        name: "maxRatio",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "weight",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "decay",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "minThresholdPoints",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "deactivatePoints",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "deactivatePoints",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "decreasePower",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      },
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "diamondCut",
    inputs: [
      {
        name: "_diamondCut",
        type: "tuple[]",
        internalType: "struct IDiamond.FacetCut[]",
        components: [
          {
            name: "facetAddress",
            type: "address",
            internalType: "address"
          },
          {
            name: "action",
            type: "uint8",
            internalType: "enum IDiamond.FacetCutAction"
          },
          {
            name: "functionSelectors",
            type: "bytes4[]",
            internalType: "bytes4[]"
          }
        ]
      },
      {
        name: "_init",
        type: "address",
        internalType: "address"
      },
      {
        name: "_calldata",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "disconnectSuperfluidGDA",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "disputeCount",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint64",
        internalType: "uint64"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "disputeIdToProposalId",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "disputeProposal",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "context",
        type: "string",
        internalType: "string"
      },
      {
        name: "_extraData",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "distribute",
    inputs: [
      {
        name: "",
        type: "address[]",
        internalType: "address[]"
      },
      {
        name: "",
        type: "bytes",
        internalType: "bytes"
      },
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "editProposal",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "",
        type: "tuple",
        internalType: "struct Metadata",
        components: [
          {
            name: "protocol",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "pointer",
            type: "string",
            internalType: "string"
          }
        ]
      },
      {
        name: "",
        type: "address",
        internalType: "address"
      },
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "getAllo",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IAllo"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getArbitrableConfig",
    inputs: [],
    outputs: [
      {
        name: "arbitrator",
        type: "address",
        internalType: "contract IArbitrator"
      },
      {
        name: "tribunalSafe",
        type: "address",
        internalType: "address"
      },
      {
        name: "submitterCollateralAmount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "challengerCollateralAmount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "defaultRuling",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "defaultRulingTimeout",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getFacets",
    inputs: [],
    outputs: [
      {
        name: "facets_",
        type: "tuple[]",
        internalType: "struct IDiamondLoupe.Facet[]",
        components: [
          {
            name: "facetAddress",
            type: "address",
            internalType: "address"
          },
          {
            name: "functionSelectors",
            type: "bytes4[]",
            internalType: "bytes4[]"
          }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getMaxAmount",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getPointSystem",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint8",
        internalType: "enum PointSystem"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getPoolAmount",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getPoolId",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getProposal",
    inputs: [
      {
        name: "_proposalId",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "submitter",
        type: "address",
        internalType: "address"
      },
      {
        name: "beneficiary",
        type: "address",
        internalType: "address"
      },
      {
        name: "requestedToken",
        type: "address",
        internalType: "address"
      },
      {
        name: "requestedAmount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "stakedAmount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "proposalStatus",
        type: "uint8",
        internalType: "enum ProposalStatus"
      },
      {
        name: "blockLast",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "convictionLast",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "threshold",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "voterStakedPoints",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "arbitrableConfigVersion",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "protocol",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getProposalMetadataPointer",
    inputs: [
      {
        name: "_proposalId",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "string",
        internalType: "string"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getProposalStakedAmount",
    inputs: [
      {
        name: "_proposalId",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getProposalVoterStake",
    inputs: [
      {
        name: "_proposalId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "_voter",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "increasePower",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      },
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "init",
    inputs: [
      {
        name: "_allo",
        type: "address",
        internalType: "address"
      },
      {
        name: "_collateralVaultTemplate",
        type: "address",
        internalType: "address"
      },
      {
        name: "_owner",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "init",
    inputs: [
      {
        name: "_allo",
        type: "address",
        internalType: "address"
      },
      {
        name: "_name",
        type: "string",
        internalType: "string"
      },
      {
        name: "_owner",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "initialize",
    inputs: [
      {
        name: "initialOwner",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "initialize",
    inputs: [
      {
        name: "_poolId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "_data",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "isPaused",
    inputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "isPaused",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "isPoolActive",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "lastRebalanceAt",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "pause",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "pause",
    inputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4"
      },
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "pauseController",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "pauseFacet",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "pausedSelectorUntil",
    inputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "pausedUntil",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "pointConfig",
    inputs: [],
    outputs: [
      {
        name: "maxAmount",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "pointSystem",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint8",
        internalType: "enum PointSystem"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "proposalCounter",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "proposalType",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint8",
        internalType: "enum ProposalType"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "proxiableUUID",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "proxyOwner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "rebalance",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "rebalanceCooldown",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "registerRecipient",
    inputs: [
      {
        name: "",
        type: "bytes",
        internalType: "bytes"
      },
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "registryCommunity",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract RegistryCommunity"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "rule",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setCollateralVaultTemplate",
    inputs: [
      {
        name: "template",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setPauseController",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setPauseFacet",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setPoolActive",
    inputs: [
      {
        name: "_active",
        type: "bool",
        internalType: "bool"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setPoolParams",
    inputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct ArbitrableConfig",
        components: [
          {
            name: "arbitrator",
            type: "address",
            internalType: "contract IArbitrator"
          },
          {
            name: "tribunalSafe",
            type: "address",
            internalType: "address"
          },
          {
            name: "submitterCollateralAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "challengerCollateralAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "defaultRuling",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "defaultRulingTimeout",
            type: "uint256",
            internalType: "uint256"
          }
        ]
      },
      {
        name: "",
        type: "tuple",
        internalType: "struct CVParams",
        components: [
          {
            name: "maxRatio",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "weight",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "decay",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "minThresholdPoints",
            type: "uint256",
            internalType: "uint256"
          }
        ]
      },
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "",
        type: "address[]",
        internalType: "address[]"
      },
      {
        name: "",
        type: "address[]",
        internalType: "address[]"
      },
      {
        name: "",
        type: "address",
        internalType: "address"
      },
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setPoolParams",
    inputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct ArbitrableConfig",
        components: [
          {
            name: "arbitrator",
            type: "address",
            internalType: "contract IArbitrator"
          },
          {
            name: "tribunalSafe",
            type: "address",
            internalType: "address"
          },
          {
            name: "submitterCollateralAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "challengerCollateralAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "defaultRuling",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "defaultRulingTimeout",
            type: "uint256",
            internalType: "uint256"
          }
        ]
      },
      {
        name: "",
        type: "tuple",
        internalType: "struct CVParams",
        components: [
          {
            name: "maxRatio",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "weight",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "decay",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "minThresholdPoints",
            type: "uint256",
            internalType: "uint256"
          }
        ]
      },
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "",
        type: "address[]",
        internalType: "address[]"
      },
      {
        name: "",
        type: "address[]",
        internalType: "address[]"
      },
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setSybilScorer",
    inputs: [
      {
        name: "_sybilScorer",
        type: "address",
        internalType: "address"
      },
      {
        name: "threshold",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "streamingEscrow",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "streamingRatePerSecond",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "superfluidGDA",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract ISuperfluidPool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "superfluidToken",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract ISuperToken"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "supportsInterface",
    inputs: [
      {
        name: "interfaceId",
        type: "bytes4",
        internalType: "bytes4"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "sybilScorer",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract ISybilScorer"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "totalPointsActivated",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "totalStaked",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "totalVoterStakePct",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [
      {
        name: "newOwner",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "unpause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "unpause",
    inputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "updateProposalConviction",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "upgradeTo",
    inputs: [
      {
        name: "newImplementation",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "upgradeToAndCall",
    inputs: [
      {
        name: "newImplementation",
        type: "address",
        internalType: "address"
      },
      {
        name: "data",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "voterStakedProposals",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      },
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "votingPowerRegistry",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IVotingPowerRegistry"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "event",
    name: "AdminChanged",
    inputs: [
      {
        name: "previousAdmin",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "newAdmin",
        type: "address",
        indexed: false,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Allocated",
    inputs: [
      {
        name: "recipientId",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "token",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "sender",
        type: "address",
        indexed: false,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "AllowlistMembersAdded",
    inputs: [
      {
        name: "poolId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "members",
        type: "address[]",
        indexed: false,
        internalType: "address[]"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "AllowlistMembersRemoved",
    inputs: [
      {
        name: "poolId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "members",
        type: "address[]",
        indexed: false,
        internalType: "address[]"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ArbitrableConfigUpdated",
    inputs: [
      {
        name: "currentArbitrableConfigVersion",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "arbitrator",
        type: "address",
        indexed: false,
        internalType: "contract IArbitrator"
      },
      {
        name: "tribunalSafe",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "submitterCollateralAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "challengerCollateralAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "defaultRuling",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "defaultRulingTimeout",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "BeaconUpgraded",
    inputs: [
      {
        name: "beacon",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "CVParamsUpdated",
    inputs: [
      {
        name: "cvParams",
        type: "tuple",
        indexed: false,
        internalType: "struct CVParams",
        components: [
          {
            name: "maxRatio",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "weight",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "decay",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "minThresholdPoints",
            type: "uint256",
            internalType: "uint256"
          }
        ]
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "DiamondCut",
    inputs: [
      {
        name: "_diamondCut",
        type: "tuple[]",
        indexed: false,
        internalType: "struct IDiamond.FacetCut[]",
        components: [
          {
            name: "facetAddress",
            type: "address",
            internalType: "address"
          },
          {
            name: "action",
            type: "uint8",
            internalType: "enum IDiamond.FacetCutAction"
          },
          {
            name: "functionSelectors",
            type: "bytes4[]",
            internalType: "bytes4[]"
          }
        ]
      },
      {
        name: "_init",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "_calldata",
        type: "bytes",
        indexed: false,
        internalType: "bytes"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "DisputeRequest",
    inputs: [
      {
        name: "_arbitrator",
        type: "address",
        indexed: true,
        internalType: "contract IArbitrator"
      },
      {
        name: "_arbitrableDisputeID",
        type: "uint256",
        indexed: true,
        internalType: "uint256"
      },
      {
        name: "_externalDisputeID",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "_templateId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "_templateUri",
        type: "string",
        indexed: false,
        internalType: "string"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "AlloDistributed",
    inputs: [
      {
        name: "recipientId",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "recipientAddress",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "sender",
        type: "address",
        indexed: false,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Distributed",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "beneficiary",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Initialized",
    inputs: [
      {
        name: "poolId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "data",
        type: "bytes",
        indexed: false,
        internalType: "bytes"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Initialized",
    inputs: [
      {
        name: "version",
        type: "uint8",
        indexed: false,
        internalType: "uint8"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "InitializedCV",
    inputs: [
      {
        name: "poolId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "data",
        type: "tuple",
        indexed: false,
        internalType: "struct CVStrategyInitializeParamsV0_0",
        components: [
          {
            name: "cvParams",
            type: "tuple",
            internalType: "struct CVParams",
            components: [
              {
                name: "maxRatio",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "weight",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "decay",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "minThresholdPoints",
                type: "uint256",
                internalType: "uint256"
              }
            ]
          },
          {
            name: "proposalType",
            type: "uint8",
            internalType: "enum ProposalType"
          },
          {
            name: "pointSystem",
            type: "uint8",
            internalType: "enum PointSystem"
          },
          {
            name: "pointConfig",
            type: "tuple",
            internalType: "struct PointSystemConfig",
            components: [
              {
                name: "maxAmount",
                type: "uint256",
                internalType: "uint256"
              }
            ]
          },
          {
            name: "arbitrableConfig",
            type: "tuple",
            internalType: "struct ArbitrableConfig",
            components: [
              {
                name: "arbitrator",
                type: "address",
                internalType: "contract IArbitrator"
              },
              {
                name: "tribunalSafe",
                type: "address",
                internalType: "address"
              },
              {
                name: "submitterCollateralAmount",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "challengerCollateralAmount",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "defaultRuling",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "defaultRulingTimeout",
                type: "uint256",
                internalType: "uint256"
              }
            ]
          },
          {
            name: "registryCommunity",
            type: "address",
            internalType: "address"
          },
          {
            name: "sybilScorer",
            type: "address",
            internalType: "address"
          }
        ]
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "InitializedCV2",
    inputs: [
      {
        name: "poolId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "data",
        type: "tuple",
        indexed: false,
        internalType: "struct CVStrategyInitializeParamsV0_1",
        components: [
          {
            name: "cvParams",
            type: "tuple",
            internalType: "struct CVParams",
            components: [
              {
                name: "maxRatio",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "weight",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "decay",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "minThresholdPoints",
                type: "uint256",
                internalType: "uint256"
              }
            ]
          },
          {
            name: "proposalType",
            type: "uint8",
            internalType: "enum ProposalType"
          },
          {
            name: "pointSystem",
            type: "uint8",
            internalType: "enum PointSystem"
          },
          {
            name: "pointConfig",
            type: "tuple",
            internalType: "struct PointSystemConfig",
            components: [
              {
                name: "maxAmount",
                type: "uint256",
                internalType: "uint256"
              }
            ]
          },
          {
            name: "arbitrableConfig",
            type: "tuple",
            internalType: "struct ArbitrableConfig",
            components: [
              {
                name: "arbitrator",
                type: "address",
                internalType: "contract IArbitrator"
              },
              {
                name: "tribunalSafe",
                type: "address",
                internalType: "address"
              },
              {
                name: "submitterCollateralAmount",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "challengerCollateralAmount",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "defaultRuling",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "defaultRulingTimeout",
                type: "uint256",
                internalType: "uint256"
              }
            ]
          },
          {
            name: "registryCommunity",
            type: "address",
            internalType: "address"
          },
          {
            name: "sybilScorer",
            type: "address",
            internalType: "address"
          },
          {
            name: "sybilScorerThreshold",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "initialAllowlist",
            type: "address[]",
            internalType: "address[]"
          }
        ]
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "InitializedCV3",
    inputs: [
      {
        name: "poolId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "data",
        type: "tuple",
        indexed: false,
        internalType: "struct CVStrategyInitializeParamsV0_2",
        components: [
          {
            name: "cvParams",
            type: "tuple",
            internalType: "struct CVParams",
            components: [
              {
                name: "maxRatio",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "weight",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "decay",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "minThresholdPoints",
                type: "uint256",
                internalType: "uint256"
              }
            ]
          },
          {
            name: "proposalType",
            type: "uint8",
            internalType: "enum ProposalType"
          },
          {
            name: "pointSystem",
            type: "uint8",
            internalType: "enum PointSystem"
          },
          {
            name: "pointConfig",
            type: "tuple",
            internalType: "struct PointSystemConfig",
            components: [
              {
                name: "maxAmount",
                type: "uint256",
                internalType: "uint256"
              }
            ]
          },
          {
            name: "arbitrableConfig",
            type: "tuple",
            internalType: "struct ArbitrableConfig",
            components: [
              {
                name: "arbitrator",
                type: "address",
                internalType: "contract IArbitrator"
              },
              {
                name: "tribunalSafe",
                type: "address",
                internalType: "address"
              },
              {
                name: "submitterCollateralAmount",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "challengerCollateralAmount",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "defaultRuling",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "defaultRulingTimeout",
                type: "uint256",
                internalType: "uint256"
              }
            ]
          },
          {
            name: "registryCommunity",
            type: "address",
            internalType: "address"
          },
          {
            name: "sybilScorer",
            type: "address",
            internalType: "address"
          },
          {
            name: "sybilScorerThreshold",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "initialAllowlist",
            type: "address[]",
            internalType: "address[]"
          },
          {
            name: "superfluidToken",
            type: "address",
            internalType: "address"
          }
        ]
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "InitializedCV4",
    inputs: [
      {
        name: "poolId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "data",
        type: "tuple",
        indexed: false,
        internalType: "struct CVStrategyInitializeParamsV0_3",
        components: [
          {
            name: "cvParams",
            type: "tuple",
            internalType: "struct CVParams",
            components: [
              {
                name: "maxRatio",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "weight",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "decay",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "minThresholdPoints",
                type: "uint256",
                internalType: "uint256"
              }
            ]
          },
          {
            name: "proposalType",
            type: "uint8",
            internalType: "enum ProposalType"
          },
          {
            name: "pointSystem",
            type: "uint8",
            internalType: "enum PointSystem"
          },
          {
            name: "pointConfig",
            type: "tuple",
            internalType: "struct PointSystemConfig",
            components: [
              {
                name: "maxAmount",
                type: "uint256",
                internalType: "uint256"
              }
            ]
          },
          {
            name: "arbitrableConfig",
            type: "tuple",
            internalType: "struct ArbitrableConfig",
            components: [
              {
                name: "arbitrator",
                type: "address",
                internalType: "contract IArbitrator"
              },
              {
                name: "tribunalSafe",
                type: "address",
                internalType: "address"
              },
              {
                name: "submitterCollateralAmount",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "challengerCollateralAmount",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "defaultRuling",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "defaultRulingTimeout",
                type: "uint256",
                internalType: "uint256"
              }
            ]
          },
          {
            name: "registryCommunity",
            type: "address",
            internalType: "address"
          },
          {
            name: "votingPowerRegistry",
            type: "address",
            internalType: "address"
          },
          {
            name: "sybilScorer",
            type: "address",
            internalType: "address"
          },
          {
            name: "sybilScorerThreshold",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "initialAllowlist",
            type: "address[]",
            internalType: "address[]"
          },
          {
            name: "superfluidToken",
            type: "address",
            internalType: "address"
          },
          {
            name: "streamingRatePerSecond",
            type: "uint256",
            internalType: "uint256"
          }
        ]
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PointsDeactivated",
    inputs: [
      {
        name: "member",
        type: "address",
        indexed: false,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PoolActive",
    inputs: [
      {
        name: "active",
        type: "bool",
        indexed: false,
        internalType: "bool"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PowerDecreased",
    inputs: [
      {
        name: "member",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "tokensUnStaked",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "pointsToDecrease",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PowerIncreased",
    inputs: [
      {
        name: "member",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "tokensStaked",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "pointsToIncrease",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ProposalCancelled",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ProposalCreated",
    inputs: [
      {
        name: "poolId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "proposalId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ProposalCreated",
    inputs: [
      {
        name: "poolId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "proposalId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "escrow",
        type: "address",
        indexed: false,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ProposalDisputed",
    inputs: [
      {
        name: "arbitrator",
        type: "address",
        indexed: false,
        internalType: "contract IArbitrator"
      },
      {
        name: "proposalId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "disputeId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "challenger",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "context",
        type: "string",
        indexed: false,
        internalType: "string"
      },
      {
        name: "timestamp",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "RebalanceCallerAuthorizationUpdated",
    inputs: [
      {
        name: "caller",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "authorized",
        type: "bool",
        indexed: false,
        internalType: "bool"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Registered",
    inputs: [
      {
        name: "recipientId",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "data",
        type: "bytes",
        indexed: false,
        internalType: "bytes"
      },
      {
        name: "sender",
        type: "address",
        indexed: false,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Ruling",
    inputs: [
      {
        name: "_arbitrator",
        type: "address",
        indexed: true,
        internalType: "contract IArbitrator"
      },
      {
        name: "_disputeID",
        type: "uint256",
        indexed: true,
        internalType: "uint256"
      },
      {
        name: "_ruling",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "StreamMemberUnitUpdated",
    inputs: [
      {
        name: "member",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "newUnit",
        type: "int96",
        indexed: false,
        internalType: "int96"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "StreamRateUpdated",
    inputs: [
      {
        name: "gda",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "flowRate",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "SuperfluidGDAConnected",
    inputs: [
      {
        name: "gda",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "by",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "SuperfluidGDADisconnected",
    inputs: [
      {
        name: "gda",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "by",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "SuperfluidPoolCreated",
    inputs: [
      {
        name: "gda",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "superfluidToken",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "maxStreamingRate",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "SuperfluidTokenUpdated",
    inputs: [
      {
        name: "superfluidToken",
        type: "address",
        indexed: false,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "SupportAdded",
    inputs: [
      {
        name: "from",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "proposalId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "totalStakedAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "convictionLast",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "SybilScorerUpdated",
    inputs: [
      {
        name: "sybilScorer",
        type: "address",
        indexed: false,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Upgraded",
    inputs: [
      {
        name: "implementation",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "error",
    name: "ALLOCATION_ACTIVE",
    inputs: []
  },
  {
    type: "error",
    name: "ALLOCATION_NOT_ACTIVE",
    inputs: []
  },
  {
    type: "error",
    name: "ALLOCATION_NOT_ENDED",
    inputs: []
  },
  {
    type: "error",
    name: "ALREADY_INITIALIZED",
    inputs: []
  },
  {
    type: "error",
    name: "AMOUNT_MISMATCH",
    inputs: []
  },
  {
    type: "error",
    name: "ANCHOR_ERROR",
    inputs: []
  },
  {
    type: "error",
    name: "ARRAY_MISMATCH",
    inputs: []
  },
  {
    type: "error",
    name: "AShouldBeUnderOrEqTwo_128",
    inputs: []
  },
  {
    type: "error",
    name: "AShouldBeUnderTwo_128",
    inputs: []
  },
  {
    type: "error",
    name: "AddressCannotBeZero",
    inputs: [
      {
        name: "input",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "AmountOverMaxRatio",
    inputs: [
      {
        name: "requestedAmount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "maxAllowed",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "poolAmount",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "ArbitratorCannotBeZero",
    inputs: []
  },
  {
    type: "error",
    name: "ArbitratorNotAllowed",
    inputs: [
      {
        name: "target",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "BShouldBeLessTwo_128",
    inputs: []
  },
  {
    type: "error",
    name: "CallerNotOwner",
    inputs: [
      {
        name: "_caller",
        type: "address",
        internalType: "address"
      },
      {
        name: "_owner",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "CannotAddFunctionToDiamondThatAlreadyExists",
    inputs: [
      {
        name: "_selector",
        type: "bytes4",
        internalType: "bytes4"
      }
    ]
  },
  {
    type: "error",
    name: "CannotAddSelectorsToZeroAddress",
    inputs: [
      {
        name: "_selectors",
        type: "bytes4[]",
        internalType: "bytes4[]"
      }
    ]
  },
  {
    type: "error",
    name: "CannotRemoveFunctionThatDoesNotExist",
    inputs: [
      {
        name: "_selector",
        type: "bytes4",
        internalType: "bytes4"
      }
    ]
  },
  {
    type: "error",
    name: "CannotRemoveImmutableFunction",
    inputs: [
      {
        name: "_selector",
        type: "bytes4",
        internalType: "bytes4"
      }
    ]
  },
  {
    type: "error",
    name: "CannotReplaceFunctionThatDoesNotExists",
    inputs: [
      {
        name: "_selector",
        type: "bytes4",
        internalType: "bytes4"
      }
    ]
  },
  {
    type: "error",
    name: "CannotReplaceFunctionWithTheSameFunctionFromTheSameFacet",
    inputs: [
      {
        name: "_selector",
        type: "bytes4",
        internalType: "bytes4"
      }
    ]
  },
  {
    type: "error",
    name: "CannotReplaceFunctionsFromFacetWithZeroAddress",
    inputs: [
      {
        name: "_selectors",
        type: "bytes4[]",
        internalType: "bytes4[]"
      }
    ]
  },
  {
    type: "error",
    name: "CannotReplaceImmutableFunction",
    inputs: [
      {
        name: "_selector",
        type: "bytes4",
        internalType: "bytes4"
      }
    ]
  },
  {
    type: "error",
    name: "ConvictionUnderMinimumThreshold",
    inputs: []
  },
  {
    type: "error",
    name: "DefaultRulingNotSet",
    inputs: []
  },
  {
    type: "error",
    name: "DisputeCooldownNotPassed",
    inputs: [
      {
        name: "_proposalId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "_remainingSec",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "INVALID",
    inputs: []
  },
  {
    type: "error",
    name: "INVALID_ADDRESS",
    inputs: []
  },
  {
    type: "error",
    name: "INVALID_FEE",
    inputs: []
  },
  {
    type: "error",
    name: "INVALID_METADATA",
    inputs: []
  },
  {
    type: "error",
    name: "INVALID_REGISTRATION",
    inputs: []
  },
  {
    type: "error",
    name: "IS_APPROVED_STRATEGY",
    inputs: []
  },
  {
    type: "error",
    name: "InitializationFunctionReverted",
    inputs: [
      {
        name: "_initializationContractAddress",
        type: "address",
        internalType: "address"
      },
      {
        name: "_calldata",
        type: "bytes",
        internalType: "bytes"
      }
    ]
  },
  {
    type: "error",
    name: "InsufficientCollateral",
    inputs: [
      {
        name: "sentAmount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "requiredAmount",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "MISMATCH",
    inputs: []
  },
  {
    type: "error",
    name: "NONCE_NOT_AVAILABLE",
    inputs: []
  },
  {
    type: "error",
    name: "NON_ZERO_VALUE",
    inputs: []
  },
  {
    type: "error",
    name: "NOT_APPROVED_STRATEGY",
    inputs: []
  },
  {
    type: "error",
    name: "NOT_ENOUGH_FUNDS",
    inputs: []
  },
  {
    type: "error",
    name: "NOT_IMPLEMENTED",
    inputs: []
  },
  {
    type: "error",
    name: "NOT_INITIALIZED",
    inputs: []
  },
  {
    type: "error",
    name: "NOT_PENDING_OWNER",
    inputs: []
  },
  {
    type: "error",
    name: "NoBytecodeAtAddress",
    inputs: [
      {
        name: "_contractAddress",
        type: "address",
        internalType: "address"
      },
      {
        name: "_message",
        type: "string",
        internalType: "string"
      }
    ]
  },
  {
    type: "error",
    name: "NoSelectorsProvidedForFacetForCut",
    inputs: [
      {
        name: "_facetAddress",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "NotEnoughPointsToSupport",
    inputs: [
      {
        name: "pointsSupport",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "pointsBalance",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "NotImplemented",
    inputs: [
      {
        name: "selector",
        type: "bytes4",
        internalType: "bytes4"
      }
    ]
  },
  {
    type: "error",
    name: "OnlyArbitrator",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address"
      },
      {
        name: "arbitrator",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "OnlyCommunityAllowed",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address"
      },
      {
        name: "registryCommunity",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "OnlyCouncilSafe",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address"
      },
      {
        name: "councilSafe",
        type: "address",
        internalType: "address"
      },
      {
        name: "owner",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "OnlyCouncilSafeOrMember",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address"
      },
      {
        name: "councilSafe",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "POOL_ACTIVE",
    inputs: []
  },
  {
    type: "error",
    name: "POOL_INACTIVE",
    inputs: []
  },
  {
    type: "error",
    name: "PoolAmountNotEnough",
    inputs: [
      {
        name: "_proposalId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "_requestedAmount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "_poolAmount",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "PoolIsEmpty",
    inputs: [
      {
        name: "poolAmount",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "ProposalDataIsEmpty",
    inputs: []
  },
  {
    type: "error",
    name: "ProposalIdCannotBeZero",
    inputs: []
  },
  {
    type: "error",
    name: "ProposalInvalidForAllocation",
    inputs: [
      {
        name: "_proposalId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "_proposalStatus",
        type: "uint8",
        internalType: "enum ProposalStatus"
      }
    ]
  },
  {
    type: "error",
    name: "ProposalNotActive",
    inputs: [
      {
        name: "_proposalId",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "ProposalNotDisputed",
    inputs: [
      {
        name: "_proposalId",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "ProposalNotInList",
    inputs: [
      {
        name: "_proposalId",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "ProposalSupportDuplicated",
    inputs: [
      {
        name: "_proposalId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "index",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "RECIPIENT_ALREADY_ACCEPTED",
    inputs: []
  },
  {
    type: "error",
    name: "RECIPIENT_ERROR",
    inputs: [
      {
        name: "recipientId",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "RECIPIENT_NOT_ACCEPTED",
    inputs: []
  },
  {
    type: "error",
    name: "REGISTRATION_ACTIVE",
    inputs: []
  },
  {
    type: "error",
    name: "REGISTRATION_NOT_ACTIVE",
    inputs: []
  },
  {
    type: "error",
    name: "RebalanceCooldownActive",
    inputs: [
      {
        name: "secondsRemaining",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "RegistryCannotBeZero",
    inputs: [
      {
        name: "registry",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "RegistryCommunityCannotBeZero",
    inputs: [
      {
        name: "registry",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "RemoveFacetAddressMustBeZeroAddress",
    inputs: [
      {
        name: "_facetAddress",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "StrategyFunctionDoesNotExist",
    inputs: [
      {
        name: "selector",
        type: "bytes4",
        internalType: "bytes4"
      }
    ]
  },
  {
    type: "error",
    name: "StrategyPaused",
    inputs: [
      {
        name: "controller",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "StrategySelectorPaused",
    inputs: [
      {
        name: "selector",
        type: "bytes4",
        internalType: "bytes4"
      },
      {
        name: "controller",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "SuperfluidPoolCreationFailed",
    inputs: []
  },
  {
    type: "error",
    name: "SupportUnderflow",
    inputs: [
      {
        name: "_support",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "_delta",
        type: "int256",
        internalType: "int256"
      },
      {
        name: "_result",
        type: "int256",
        internalType: "int256"
      }
    ]
  },
  {
    type: "error",
    name: "SybilScorerNotAllowed",
    inputs: [
      {
        name: "target",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "TokenCannotBeZero",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "TokenNotAllowed",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "UNAUTHORIZED",
    inputs: []
  },
  {
    type: "error",
    name: "UserCannotBeZero",
    inputs: [
      {
        name: "user",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "UserCannotExecuteAction",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "UserIsInactive",
    inputs: [
      {
        name: "user",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "UserNotInRegistry",
    inputs: [
      {
        name: "user",
        type: "address",
        internalType: "address"
      },
      {
        name: "registry",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "ZERO_ADDRESS",
    inputs: []
  },
  {
    type: "function",
    name: "MAX_ALLOCATIONS_PER_TX",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "MAX_PROPOSAL_COUNT",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "MAX_SYNC_BATCH_MEMBERS",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "MAX_VOTER_STAKED_PROPOSALS",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "_isStrategyEnabled",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "proposalExists",
    inputs: [
      {
        name: "_proposalID",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "setVotingPowerRegistry",
    inputs: [
      {
        name: "_registry",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "event",
    name: "SuperfluidStreamingRateUpdated",
    inputs: [
      {
        name: "streamingRatePerSecond",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "VotingPowerRegistryUpdated",
    inputs: [
      {
        name: "oldRegistry",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "newRegistry",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "error",
    name: "ApproveFailed",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address"
      },
      {
        name: "spender",
        type: "address",
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "BlockNumberRegression",
    inputs: [
      {
        name: "recordedBlock",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "currentBlock",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "OnlyActiveProposal",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "OnlyAllo",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address"
      },
      {
        name: "allo",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "OnlyInitialized",
    inputs: [
      {
        name: "poolId",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "OnlyMember",
    inputs: [
      {
        name: "wallet",
        type: "address",
        internalType: "address"
      },
      {
        name: "community",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "OnlyOwner",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address"
      },
      {
        name: "ownerAddress",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "OnlyRegistryCommunity",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address"
      },
      {
        name: "registry",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "OnlySubmitter",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "submitter",
        type: "address",
        internalType: "address"
      },
      {
        name: "sender",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "ProposalActive",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "ProposalDoesNotExist",
    inputs: [
      {
        name: "proposalID",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "RebalanceCallFailed",
    inputs: []
  },
  {
    type: "error",
    name: "StreamingRateOverflow",
    inputs: [
      {
        name: "streamingRatePerSecond",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "SuperfluidGDAConnectFailed",
    inputs: [
      {
        name: "gda",
        type: "address",
        internalType: "address"
      },
      {
        name: "superToken",
        type: "address",
        internalType: "address"
      },
      {
        name: "caller",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "SuperfluidGDADisconnectFailed",
    inputs: [
      {
        name: "gda",
        type: "address",
        internalType: "address"
      },
      {
        name: "superToken",
        type: "address",
        internalType: "address"
      },
      {
        name: "caller",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "SuperfluidUnderlyingTokenMismatch",
    inputs: [
      {
        name: "expectedUnderlying",
        type: "address",
        internalType: "address"
      },
      {
        name: "actualUnderlying",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "VotingPowerRegistryNotAllowed",
    inputs: [
      {
        name: "target",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "NativeTransferFailed",
    inputs: [
      {
        name: "recipient",
        type: "address",
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "NoActiveGovernancePoints",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "TooManyAllocations",
    inputs: [
      {
        name: "provided",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "maxAllowed",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "TooManyVoterStakedProposals",
    inputs: [
      {
        name: "voter",
        type: "address",
        internalType: "address"
      },
      {
        name: "current",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "maxAllowed",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "event",
    name: "CollateralPayoutFailed",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
        indexed: true,
        internalType: "uint256"
      },
      {
        name: "fromUser",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "toUser",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "reason",
        type: "bytes",
        indexed: false,
        internalType: "bytes"
      }
    ],
    anonymous: false
  },
  {
    type: "error",
    name: "ChallengerCollateralTooLow",
    inputs: [
      {
        name: "sent",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "required",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "DefaultRulingNotConfigured",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "DisputeCooldownActive",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "secondsRemaining",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "ProposalStatusInvalid",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "currentStatus",
        type: "uint8",
        internalType: "enum ProposalStatus"
      }
    ]
  },
  {
    type: "error",
    name: "UpdateMemberUnitsFailed",
    inputs: [
      {
        name: "member",
        type: "address",
        internalType: "address"
      },
      {
        name: "units",
        type: "uint128",
        internalType: "uint128"
      }
    ]
  },
  {
    type: "event",
    name: "PauseControllerUpdated",
    inputs: [
      {
        name: "controller",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PauseFacetUpdated",
    inputs: [
      {
        name: "facet",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "error",
    name: "NotOwner",
    inputs: [
      {
        name: "caller",
        type: "address",
        internalType: "address"
      },
      {
        name: "owner",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "PauseControllerNotSet",
    inputs: []
  },
  {
    type: "function",
    name: "ONE_HOUR",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "event",
    name: "ProposalEdited",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "metadata",
        type: "tuple",
        indexed: false,
        internalType: "struct Metadata",
        components: [
          {
            name: "protocol",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "pointer",
            type: "string",
            internalType: "string"
          }
        ]
      },
      {
        name: "beneficiary",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "requestedAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "error",
    name: "ArbitratorNotSet",
    inputs: []
  },
  {
    type: "error",
    name: "BeneficiaryEditTimeout",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "currentBeneficiary",
        type: "address",
        internalType: "address"
      },
      {
        name: "newBeneficiary",
        type: "address",
        internalType: "address"
      },
      {
        name: "creationTimestamp",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "CannotEditRequestedAmountWithActiveSupport",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "currentAmount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "newAmount",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "MetadataEditTimeout",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "currentMetadata",
        type: "string",
        internalType: "string"
      },
      {
        name: "newMetadata",
        type: "string",
        internalType: "string"
      },
      {
        name: "creationTimestamp",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "ProposalLimitReached",
    inputs: [
      {
        name: "current",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "max",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "StreamingEscrowFactoryNotSet",
    inputs: []
  },
  {
    type: "error",
    name: "UnexpectedRequestToken",
    inputs: [
      {
        name: "requestedToken",
        type: "address",
        internalType: "address"
      },
      {
        name: "poolToken",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "function",
    name: "isAuthorizedRebalanceCaller",
    inputs: [
      {
        name: "_caller",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "setAuthorizedRebalanceCaller",
    inputs: [
      {
        name: "_caller",
        type: "address",
        internalType: "address"
      },
      {
        name: "_authorized",
        type: "bool",
        internalType: "bool"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "stopEscrowStream",
    inputs: [
      {
        name: "escrow",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "wrapIfNeeded",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "event",
    name: "EscrowStreamStopped",
    inputs: [
      {
        name: "escrow",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "stoppedBy",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "EscrowSyncFailed",
    inputs: [
      {
        name: "escrow",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "reason",
        type: "bytes",
        indexed: false,
        internalType: "bytes"
      }
    ],
    anonymous: false
  },
  {
    type: "error",
    name: "StreamingEscrowNotFound",
    inputs: [
      {
        name: "escrow",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "SuperTokenTransferFailed",
    inputs: [
      {
        name: "to",
        type: "address",
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "UnauthorizedRebalanceCaller",
    inputs: [
      {
        name: "caller",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "function",
    name: "batchSyncPower",
    inputs: [
      {
        name: "_members",
        type: "address[]",
        internalType: "address[]"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "isAuthorizedSyncCaller",
    inputs: [
      {
        name: "_caller",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "setAuthorizedSyncCaller",
    inputs: [
      {
        name: "_caller",
        type: "address",
        internalType: "address"
      },
      {
        name: "_authorized",
        type: "bool",
        internalType: "bool"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "syncPower",
    inputs: [
      {
        name: "_member",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "event",
    name: "AuthorizedSyncCallerUpdated",
    inputs: [
      {
        name: "caller",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "authorized",
        type: "bool",
        indexed: false,
        internalType: "bool"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "MemberPowerRevoked",
    inputs: [
      {
        name: "member",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "powerRemoved",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PowerSynced",
    inputs: [
      {
        name: "member",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "oldPower",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "newPower",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "error",
    name: "NotAuthorizedSyncCaller",
    inputs: [
      {
        name: "caller",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "SyncBatchTooLarge",
    inputs: [
      {
        name: "provided",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "maxAllowed",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "SyncDisabledForInternalRegistry",
    inputs: [
      {
        name: "registryCommunity",
        type: "address",
        internalType: "address"
      }
    ]
  }
];

// ../../pkg/contracts/abis/DiamondAggregated/RegistryCommunity.json
var abi2 = [
  {
    type: "fallback",
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "COUNCIL_MEMBER",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "DEFAULT_ADMIN_ROLE",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "MAX_FEE",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "NATIVE",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "PRECISION_SCALE",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "VERSION",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "string",
        internalType: "string"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "acceptCouncilSafe",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "activateMemberInStrategy",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      },
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "addStrategy",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "addStrategyByPoolId",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "addressToMemberInfo",
    inputs: [
      {
        name: "member",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "member",
        type: "address",
        internalType: "address"
      },
      {
        name: "stakedAmount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "isRegistered",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "allo",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract FAllo"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "cloneNonce",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "collateralVaultTemplate",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "communityFee",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "communityName",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "string",
        internalType: "string"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "councilSafe",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract ISafe"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "covenantIpfsHash",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "string",
        internalType: "string"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "createPool",
    inputs: [
      {
        name: "_strategy",
        type: "address",
        internalType: "address"
      },
      {
        name: "_token",
        type: "address",
        internalType: "address"
      },
      {
        name: "_params",
        type: "tuple",
        internalType: "struct CVStrategyInitializeParamsV0_3",
        components: [
          {
            name: "cvParams",
            type: "tuple",
            internalType: "struct CVParams",
            components: [
              {
                name: "maxRatio",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "weight",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "decay",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "minThresholdPoints",
                type: "uint256",
                internalType: "uint256"
              }
            ]
          },
          {
            name: "proposalType",
            type: "uint8",
            internalType: "enum ProposalType"
          },
          {
            name: "pointSystem",
            type: "uint8",
            internalType: "enum PointSystem"
          },
          {
            name: "pointConfig",
            type: "tuple",
            internalType: "struct PointSystemConfig",
            components: [
              {
                name: "maxAmount",
                type: "uint256",
                internalType: "uint256"
              }
            ]
          },
          {
            name: "arbitrableConfig",
            type: "tuple",
            internalType: "struct ArbitrableConfig",
            components: [
              {
                name: "arbitrator",
                type: "address",
                internalType: "contract IArbitrator"
              },
              {
                name: "tribunalSafe",
                type: "address",
                internalType: "address"
              },
              {
                name: "submitterCollateralAmount",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "challengerCollateralAmount",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "defaultRuling",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "defaultRulingTimeout",
                type: "uint256",
                internalType: "uint256"
              }
            ]
          },
          {
            name: "registryCommunity",
            type: "address",
            internalType: "address"
          },
          {
            name: "votingPowerRegistry",
            type: "address",
            internalType: "address"
          },
          {
            name: "sybilScorer",
            type: "address",
            internalType: "address"
          },
          {
            name: "sybilScorerThreshold",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "initialAllowlist",
            type: "address[]",
            internalType: "address[]"
          },
          {
            name: "superfluidToken",
            type: "address",
            internalType: "address"
          },
          {
            name: "streamingRatePerSecond",
            type: "uint256",
            internalType: "uint256"
          }
        ]
      },
      {
        name: "_metadata",
        type: "tuple",
        internalType: "struct Metadata",
        components: [
          {
            name: "protocol",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "pointer",
            type: "string",
            internalType: "string"
          }
        ]
      }
    ],
    outputs: [
      {
        name: "poolId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "strategy",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "createPool",
    inputs: [
      {
        name: "_token",
        type: "address",
        internalType: "address"
      },
      {
        name: "_params",
        type: "tuple",
        internalType: "struct CVStrategyInitializeParamsV0_3",
        components: [
          {
            name: "cvParams",
            type: "tuple",
            internalType: "struct CVParams",
            components: [
              {
                name: "maxRatio",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "weight",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "decay",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "minThresholdPoints",
                type: "uint256",
                internalType: "uint256"
              }
            ]
          },
          {
            name: "proposalType",
            type: "uint8",
            internalType: "enum ProposalType"
          },
          {
            name: "pointSystem",
            type: "uint8",
            internalType: "enum PointSystem"
          },
          {
            name: "pointConfig",
            type: "tuple",
            internalType: "struct PointSystemConfig",
            components: [
              {
                name: "maxAmount",
                type: "uint256",
                internalType: "uint256"
              }
            ]
          },
          {
            name: "arbitrableConfig",
            type: "tuple",
            internalType: "struct ArbitrableConfig",
            components: [
              {
                name: "arbitrator",
                type: "address",
                internalType: "contract IArbitrator"
              },
              {
                name: "tribunalSafe",
                type: "address",
                internalType: "address"
              },
              {
                name: "submitterCollateralAmount",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "challengerCollateralAmount",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "defaultRuling",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "defaultRulingTimeout",
                type: "uint256",
                internalType: "uint256"
              }
            ]
          },
          {
            name: "registryCommunity",
            type: "address",
            internalType: "address"
          },
          {
            name: "votingPowerRegistry",
            type: "address",
            internalType: "address"
          },
          {
            name: "sybilScorer",
            type: "address",
            internalType: "address"
          },
          {
            name: "sybilScorerThreshold",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "initialAllowlist",
            type: "address[]",
            internalType: "address[]"
          },
          {
            name: "superfluidToken",
            type: "address",
            internalType: "address"
          },
          {
            name: "streamingRatePerSecond",
            type: "uint256",
            internalType: "uint256"
          }
        ]
      },
      {
        name: "_metadata",
        type: "tuple",
        internalType: "struct Metadata",
        components: [
          {
            name: "protocol",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "pointer",
            type: "string",
            internalType: "string"
          }
        ]
      }
    ],
    outputs: [
      {
        name: "poolId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "strategy",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "deactivateMemberInStrategy",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      },
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "decreasePower",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "diamondCut",
    inputs: [
      {
        name: "_diamondCut",
        type: "tuple[]",
        internalType: "struct IDiamond.FacetCut[]",
        components: [
          {
            name: "facetAddress",
            type: "address",
            internalType: "address"
          },
          {
            name: "action",
            type: "uint8",
            internalType: "enum IDiamond.FacetCutAction"
          },
          {
            name: "functionSelectors",
            type: "bytes4[]",
            internalType: "bytes4[]"
          }
        ]
      },
      {
        name: "_init",
        type: "address",
        internalType: "address"
      },
      {
        name: "_calldata",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "enabledStrategies",
    inputs: [
      {
        name: "strategy",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "isEnabled",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "feeReceiver",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "gardenToken",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IERC20"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getBasisStakedAmount",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "getMemberPowerInStrategy",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      },
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "getMemberStakedAmount",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "getRoleAdmin",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getStakeAmountWithFees",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "grantRole",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        internalType: "bytes32"
      },
      {
        name: "account",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "hasRole",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        internalType: "bytes32"
      },
      {
        name: "account",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "increasePower",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "initialize",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct RegistryCommunityInitializeParams",
        components: [
          {
            name: "_allo",
            type: "address",
            internalType: "address"
          },
          {
            name: "_gardenToken",
            type: "address",
            internalType: "contract IERC20"
          },
          {
            name: "_registerStakeAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "_communityFee",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "_nonce",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "_registryFactory",
            type: "address",
            internalType: "address"
          },
          {
            name: "_feeReceiver",
            type: "address",
            internalType: "address"
          },
          {
            name: "_metadata",
            type: "tuple",
            internalType: "struct Metadata",
            components: [
              {
                name: "protocol",
                type: "uint256",
                internalType: "uint256"
              },
              {
                name: "pointer",
                type: "string",
                internalType: "string"
              }
            ]
          },
          {
            name: "_councilSafe",
            type: "address",
            internalType: "address payable"
          },
          {
            name: "_communityName",
            type: "string",
            internalType: "string"
          },
          {
            name: "_isKickEnabled",
            type: "bool",
            internalType: "bool"
          },
          {
            name: "covenantIpfsHash",
            type: "string",
            internalType: "string"
          }
        ]
      },
      {
        name: "_strategyTemplate",
        type: "address",
        internalType: "address"
      },
      {
        name: "_collateralVaultTemplate",
        type: "address",
        internalType: "address"
      },
      {
        name: "_owner",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "initialize",
    inputs: [
      {
        name: "initialOwner",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "isCouncilMember",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "isKickEnabled",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "isMember",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "kickMember",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      },
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "memberActivatedInStrategies",
    inputs: [
      {
        name: "member",
        type: "address",
        internalType: "address"
      },
      {
        name: "strategy",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "isActivated",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "memberPowerInStrategy",
    inputs: [
      {
        name: "strategy",
        type: "address",
        internalType: "address"
      },
      {
        name: "member",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "power",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "onlyStrategyEnabled",
    inputs: [
      {
        name: "_strategy",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "pendingCouncilSafe",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address payable"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "profileId",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "proxiableUUID",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "proxyOwner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "registerStakeAmount",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "registry",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IRegistry"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "registryFactory",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "rejectPool",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "removeStrategy",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "removeStrategyByPoolId",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "renounceRole",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        internalType: "bytes32"
      },
      {
        name: "account",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "revokeRole",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        internalType: "bytes32"
      },
      {
        name: "account",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setArchived",
    inputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setBasisStakedAmount",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setCollateralVaultTemplate",
    inputs: [
      {
        name: "template",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setCommunityFee",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setCommunityParams",
    inputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct CommunityParams",
        components: [
          {
            name: "councilSafe",
            type: "address",
            internalType: "address"
          },
          {
            name: "feeReceiver",
            type: "address",
            internalType: "address"
          },
          {
            name: "communityFee",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "communityName",
            type: "string",
            internalType: "string"
          },
          {
            name: "registerStakeAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "isKickEnabled",
            type: "bool",
            internalType: "bool"
          },
          {
            name: "covenantIpfsHash",
            type: "string",
            internalType: "string"
          }
        ]
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setCouncilSafe",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address payable"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setPauseController",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setStrategyTemplate",
    inputs: [
      {
        name: "template",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "stakeAndRegisterMember",
    inputs: [
      {
        name: "",
        type: "string",
        internalType: "string"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "strategiesByMember",
    inputs: [
      {
        name: "member",
        type: "address",
        internalType: "address"
      },
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "strategiesAddresses",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "strategyTemplate",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "supportsInterface",
    inputs: [
      {
        name: "interfaceId",
        type: "bytes4",
        internalType: "bytes4"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "totalMembers",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [
      {
        name: "newOwner",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "unregisterMember",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "upgradeTo",
    inputs: [
      {
        name: "newImplementation",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "upgradeToAndCall",
    inputs: [
      {
        name: "newImplementation",
        type: "address",
        internalType: "address"
      },
      {
        name: "data",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "event",
    name: "AdminChanged",
    inputs: [
      {
        name: "previousAdmin",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "newAdmin",
        type: "address",
        indexed: false,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "BasisStakedAmountUpdated",
    inputs: [
      {
        name: "_newAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "BeaconUpgraded",
    inputs: [
      {
        name: "beacon",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "CommunityArchived",
    inputs: [
      {
        name: "_archived",
        type: "bool",
        indexed: false,
        internalType: "bool"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "CommunityFeeUpdated",
    inputs: [
      {
        name: "_newFee",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "CommunityNameUpdated",
    inputs: [
      {
        name: "_communityName",
        type: "string",
        indexed: false,
        internalType: "string"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "CouncilSafeChangeStarted",
    inputs: [
      {
        name: "_safeOwner",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "_newSafeOwner",
        type: "address",
        indexed: false,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "CouncilSafeUpdated",
    inputs: [
      {
        name: "_safe",
        type: "address",
        indexed: false,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "CovenantIpfsHashUpdated",
    inputs: [
      {
        name: "_covenantIpfsHash",
        type: "string",
        indexed: false,
        internalType: "string"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "DiamondCut",
    inputs: [
      {
        name: "_diamondCut",
        type: "tuple[]",
        indexed: false,
        internalType: "struct IDiamond.FacetCut[]",
        components: [
          {
            name: "facetAddress",
            type: "address",
            internalType: "address"
          },
          {
            name: "action",
            type: "uint8",
            internalType: "enum IDiamond.FacetCutAction"
          },
          {
            name: "functionSelectors",
            type: "bytes4[]",
            internalType: "bytes4[]"
          }
        ]
      },
      {
        name: "_init",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "_calldata",
        type: "bytes",
        indexed: false,
        internalType: "bytes"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "FeeReceiverChanged",
    inputs: [
      {
        name: "_feeReceiver",
        type: "address",
        indexed: false,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Initialized",
    inputs: [
      {
        name: "version",
        type: "uint8",
        indexed: false,
        internalType: "uint8"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "KickEnabledUpdated",
    inputs: [
      {
        name: "_isKickEnabled",
        type: "bool",
        indexed: false,
        internalType: "bool"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "MemberActivatedStrategy",
    inputs: [
      {
        name: "_member",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "_strategy",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "_pointsToIncrease",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "MemberDeactivatedStrategy",
    inputs: [
      {
        name: "_member",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "_strategy",
        type: "address",
        indexed: false,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "MemberKicked",
    inputs: [
      {
        name: "_member",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "_transferAddress",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "_amountReturned",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "MemberPowerDecreased",
    inputs: [
      {
        name: "_member",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "_unstakedAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "MemberPowerIncreased",
    inputs: [
      {
        name: "_member",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "_stakedAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "MemberRegistered",
    inputs: [
      {
        name: "_member",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "_amountStaked",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "MemberRegisteredWithCovenant",
    inputs: [
      {
        name: "_member",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "_amountStaked",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "_covenantSig",
        type: "string",
        indexed: false,
        internalType: "string"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "MemberUnregistered",
    inputs: [
      {
        name: "_member",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "_amountReturned",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PoolCreated",
    inputs: [
      {
        name: "_poolId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "_strategy",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "_community",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "_token",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "_metadata",
        type: "tuple",
        indexed: false,
        internalType: "struct Metadata",
        components: [
          {
            name: "protocol",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "pointer",
            type: "string",
            internalType: "string"
          }
        ]
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PoolRejected",
    inputs: [
      {
        name: "_strategy",
        type: "address",
        indexed: false,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "RegistryInitialized",
    inputs: [
      {
        name: "_profileId",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32"
      },
      {
        name: "_communityName",
        type: "string",
        indexed: false,
        internalType: "string"
      },
      {
        name: "_metadata",
        type: "tuple",
        indexed: false,
        internalType: "struct Metadata",
        components: [
          {
            name: "protocol",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "pointer",
            type: "string",
            internalType: "string"
          }
        ]
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "RoleAdminChanged",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32"
      },
      {
        name: "previousAdminRole",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32"
      },
      {
        name: "newAdminRole",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "RoleGranted",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32"
      },
      {
        name: "account",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "RoleRevoked",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32"
      },
      {
        name: "account",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "StrategyAdded",
    inputs: [
      {
        name: "_strategy",
        type: "address",
        indexed: false,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "StrategyRemoved",
    inputs: [
      {
        name: "_strategy",
        type: "address",
        indexed: false,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Upgraded",
    inputs: [
      {
        name: "implementation",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "error",
    name: "AllowlistTooBig",
    inputs: [
      {
        name: "size",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "CallerNotOwner",
    inputs: [
      {
        name: "_caller",
        type: "address",
        internalType: "address"
      },
      {
        name: "_owner",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "CannotAddFunctionToDiamondThatAlreadyExists",
    inputs: [
      {
        name: "_selector",
        type: "bytes4",
        internalType: "bytes4"
      }
    ]
  },
  {
    type: "error",
    name: "CannotAddSelectorsToZeroAddress",
    inputs: [
      {
        name: "_selectors",
        type: "bytes4[]",
        internalType: "bytes4[]"
      }
    ]
  },
  {
    type: "error",
    name: "CannotRemoveFunctionThatDoesNotExist",
    inputs: [
      {
        name: "_selector",
        type: "bytes4",
        internalType: "bytes4"
      }
    ]
  },
  {
    type: "error",
    name: "CannotRemoveImmutableFunction",
    inputs: [
      {
        name: "_selector",
        type: "bytes4",
        internalType: "bytes4"
      }
    ]
  },
  {
    type: "error",
    name: "CannotReplaceFunctionThatDoesNotExists",
    inputs: [
      {
        name: "_selector",
        type: "bytes4",
        internalType: "bytes4"
      }
    ]
  },
  {
    type: "error",
    name: "CannotReplaceFunctionWithTheSameFunctionFromTheSameFacet",
    inputs: [
      {
        name: "_selector",
        type: "bytes4",
        internalType: "bytes4"
      }
    ]
  },
  {
    type: "error",
    name: "CannotReplaceFunctionsFromFacetWithZeroAddress",
    inputs: [
      {
        name: "_selectors",
        type: "bytes4[]",
        internalType: "bytes4[]"
      }
    ]
  },
  {
    type: "error",
    name: "CannotReplaceImmutableFunction",
    inputs: [
      {
        name: "_selector",
        type: "bytes4",
        internalType: "bytes4"
      }
    ]
  },
  {
    type: "error",
    name: "CantDecreaseMoreThanPower",
    inputs: [
      {
        name: "_decreaseAmount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "_currentPower",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "CommunityFunctionDoesNotExist",
    inputs: [
      {
        name: "selector",
        type: "bytes4",
        internalType: "bytes4"
      }
    ]
  },
  {
    type: "error",
    name: "CommunityPaused",
    inputs: [
      {
        name: "controller",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "CommunitySelectorPaused",
    inputs: [
      {
        name: "selector",
        type: "bytes4",
        internalType: "bytes4"
      },
      {
        name: "controller",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "DecreaseUnderMinimum",
    inputs: []
  },
  {
    type: "error",
    name: "InitializationFunctionReverted",
    inputs: [
      {
        name: "_initializationContractAddress",
        type: "address",
        internalType: "address"
      },
      {
        name: "_calldata",
        type: "bytes",
        internalType: "bytes"
      }
    ]
  },
  {
    type: "error",
    name: "KickNotEnabled",
    inputs: []
  },
  {
    type: "error",
    name: "NewFeeGreaterThanMax",
    inputs: []
  },
  {
    type: "error",
    name: "NoBytecodeAtAddress",
    inputs: [
      {
        name: "_contractAddress",
        type: "address",
        internalType: "address"
      },
      {
        name: "_message",
        type: "string",
        internalType: "string"
      }
    ]
  },
  {
    type: "error",
    name: "NoSelectorsProvidedForFacetForCut",
    inputs: [
      {
        name: "_facetAddress",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "OnlyEmptyCommunity",
    inputs: [
      {
        name: "totalMembers",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "PointsDeactivated",
    inputs: []
  },
  {
    type: "error",
    name: "RemoveFacetAddressMustBeZeroAddress",
    inputs: [
      {
        name: "_facetAddress",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "SenderNotNewOwner",
    inputs: []
  },
  {
    type: "error",
    name: "SenderNotStrategy",
    inputs: []
  },
  {
    type: "error",
    name: "StrategyDisabled",
    inputs: []
  },
  {
    type: "error",
    name: "StrategyExists",
    inputs: []
  },
  {
    type: "error",
    name: "UserAlreadyActivated",
    inputs: []
  },
  {
    type: "error",
    name: "UserNotInCouncil",
    inputs: [
      {
        name: "_user",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "UserNotInRegistry",
    inputs: []
  },
  {
    type: "error",
    name: "ValueCannotBeZero",
    inputs: []
  },
  {
    type: "function",
    name: "MAX_STRATEGIES_PER_MEMBER",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "registerMember",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "error",
    name: "StakeRequiredForMembership",
    inputs: []
  },
  {
    type: "function",
    name: "isPaused",
    inputs: [
      {
        name: "selector",
        type: "bytes4",
        internalType: "bytes4"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "pause",
    inputs: [
      {
        name: "duration",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "pauseController",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "pauseFacet",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "pausedSelectorUntil",
    inputs: [
      {
        name: "selector",
        type: "bytes4",
        internalType: "bytes4"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "pausedUntil",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "setPauseFacet",
    inputs: [
      {
        name: "facet",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "unpause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "event",
    name: "PauseControllerUpdated",
    inputs: [
      {
        name: "controller",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PauseFacetUpdated",
    inputs: [
      {
        name: "facet",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "error",
    name: "NotOwner",
    inputs: [
      {
        name: "caller",
        type: "address",
        internalType: "address"
      },
      {
        name: "owner",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "PauseControllerNotSet",
    inputs: []
  },
  {
    type: "function",
    name: "ercAddress",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "isRegisteredMember",
    inputs: [
      {
        name: "_member",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "error",
    name: "TooManyMemberStrategies",
    inputs: [
      {
        name: "member",
        type: "address",
        internalType: "address"
      },
      {
        name: "current",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "maxAllowed",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "StrategyNotEnabled",
    inputs: []
  }
];

// ../../pkg/contracts/abis/GoodDollarSybil.sol/GoodDollarSybil.json
var abi3 = [{ type: "function", name: "activateStrategy", inputs: [{ name: "_address", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "addStrategy", inputs: [{ name: "_strategy", type: "address", internalType: "address" }, { name: "", type: "uint256", internalType: "uint256" }, { name: "_councilSafe", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "canExecuteAction", inputs: [{ name: "_user", type: "address", internalType: "address" }, { name: "", type: "address", internalType: "address" }], outputs: [{ name: "isUserValid", type: "bool", internalType: "bool" }], stateMutability: "view" }, { type: "function", name: "changeListManager", inputs: [{ name: "_newManager", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "initialize", inputs: [{ name: "_listManager", type: "address", internalType: "address" }, { name: "_owner", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "initialize", inputs: [{ name: "initialOwner", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "invalidateUser", inputs: [{ name: "_user", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "listManager", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "modifyThreshold", inputs: [{ name: "", type: "address", internalType: "address" }, { name: "", type: "uint256", internalType: "uint256" }], outputs: [], stateMutability: "pure" }, { type: "function", name: "owner", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "proxiableUUID", inputs: [], outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }], stateMutability: "view" }, { type: "function", name: "proxyOwner", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "renounceOwnership", inputs: [], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "strategies", inputs: [{ name: "", type: "address", internalType: "address" }], outputs: [{ name: "threshold", type: "uint256", internalType: "uint256" }, { name: "active", type: "bool", internalType: "bool" }, { name: "councilSafe", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "transferOwnership", inputs: [{ name: "newOwner", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "upgradeTo", inputs: [{ name: "newImplementation", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "upgradeToAndCall", inputs: [{ name: "newImplementation", type: "address", internalType: "address" }, { name: "data", type: "bytes", internalType: "bytes" }], outputs: [], stateMutability: "payable" }, { type: "function", name: "userValidity", inputs: [{ name: "", type: "address", internalType: "address" }], outputs: [{ name: "", type: "bool", internalType: "bool" }], stateMutability: "view" }, { type: "function", name: "validateUser", inputs: [{ name: "_user", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "event", name: "AdminChanged", inputs: [{ name: "previousAdmin", type: "address", indexed: false, internalType: "address" }, { name: "newAdmin", type: "address", indexed: false, internalType: "address" }], anonymous: false }, { type: "event", name: "BeaconUpgraded", inputs: [{ name: "beacon", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "GoodDollarStrategyAdded", inputs: [{ name: "strategy", type: "address", indexed: true, internalType: "address" }, { name: "councilSafe", type: "address", indexed: false, internalType: "address" }], anonymous: false }, { type: "event", name: "Initialized", inputs: [{ name: "version", type: "uint8", indexed: false, internalType: "uint8" }], anonymous: false }, { type: "event", name: "ListManagerChanged", inputs: [{ name: "oldManager", type: "address", indexed: true, internalType: "address" }, { name: "newManager", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "OwnershipTransferred", inputs: [{ name: "previousOwner", type: "address", indexed: true, internalType: "address" }, { name: "newOwner", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "Upgraded", inputs: [{ name: "implementation", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "UserInvalidated", inputs: [{ name: "user", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "UserValidated", inputs: [{ name: "user", type: "address", indexed: false, internalType: "address" }], anonymous: false }, { type: "error", name: "CallerNotOwner", inputs: [{ name: "_caller", type: "address", internalType: "address" }, { name: "_owner", type: "address", internalType: "address" }] }, { type: "error", name: "NotSupported", inputs: [] }, { type: "error", name: "OnlyAuthorized", inputs: [] }, { type: "error", name: "OnlyCouncilOrAuthorized", inputs: [] }, { type: "error", name: "ZeroAddress", inputs: [] }];

// ../../pkg/contracts/abis/IAllo.sol/IAllo.json
var abi4 = [{ type: "function", name: "addPoolManager", inputs: [{ name: "_poolId", type: "uint256", internalType: "uint256" }, { name: "_manager", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "addToCloneableStrategies", inputs: [{ name: "_strategy", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "allocate", inputs: [{ name: "_poolId", type: "uint256", internalType: "uint256" }, { name: "_data", type: "bytes", internalType: "bytes" }], outputs: [], stateMutability: "payable" }, { type: "function", name: "batchAllocate", inputs: [{ name: "_poolIds", type: "uint256[]", internalType: "uint256[]" }, { name: "_datas", type: "bytes[]", internalType: "bytes[]" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "batchRegisterRecipient", inputs: [{ name: "_poolIds", type: "uint256[]", internalType: "uint256[]" }, { name: "_data", type: "bytes[]", internalType: "bytes[]" }], outputs: [{ name: "", type: "address[]", internalType: "address[]" }], stateMutability: "nonpayable" }, { type: "function", name: "createPool", inputs: [{ name: "_profileId", type: "bytes32", internalType: "bytes32" }, { name: "_strategy", type: "address", internalType: "address" }, { name: "_initStrategyData", type: "bytes", internalType: "bytes" }, { name: "_token", type: "address", internalType: "address" }, { name: "_amount", type: "uint256", internalType: "uint256" }, { name: "_metadata", type: "tuple", internalType: "struct Metadata", components: [{ name: "protocol", type: "uint256", internalType: "uint256" }, { name: "pointer", type: "string", internalType: "string" }] }, { name: "_managers", type: "address[]", internalType: "address[]" }], outputs: [{ name: "poolId", type: "uint256", internalType: "uint256" }], stateMutability: "payable" }, { type: "function", name: "createPoolWithCustomStrategy", inputs: [{ name: "_profileId", type: "bytes32", internalType: "bytes32" }, { name: "_strategy", type: "address", internalType: "address" }, { name: "_initStrategyData", type: "bytes", internalType: "bytes" }, { name: "_token", type: "address", internalType: "address" }, { name: "_amount", type: "uint256", internalType: "uint256" }, { name: "_metadata", type: "tuple", internalType: "struct Metadata", components: [{ name: "protocol", type: "uint256", internalType: "uint256" }, { name: "pointer", type: "string", internalType: "string" }] }, { name: "_managers", type: "address[]", internalType: "address[]" }], outputs: [{ name: "poolId", type: "uint256", internalType: "uint256" }], stateMutability: "payable" }, { type: "function", name: "distribute", inputs: [{ name: "_poolId", type: "uint256", internalType: "uint256" }, { name: "_recipientIds", type: "address[]", internalType: "address[]" }, { name: "_data", type: "bytes", internalType: "bytes" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "getBaseFee", inputs: [], outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "view" }, { type: "function", name: "getFeeDenominator", inputs: [], outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "view" }, { type: "function", name: "getPercentFee", inputs: [], outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "view" }, { type: "function", name: "getPool", inputs: [{ name: "_poolId", type: "uint256", internalType: "uint256" }], outputs: [{ name: "", type: "tuple", internalType: "struct IAllo.Pool", components: [{ name: "profileId", type: "bytes32", internalType: "bytes32" }, { name: "strategy", type: "address", internalType: "contract IStrategy" }, { name: "token", type: "address", internalType: "address" }, { name: "metadata", type: "tuple", internalType: "struct Metadata", components: [{ name: "protocol", type: "uint256", internalType: "uint256" }, { name: "pointer", type: "string", internalType: "string" }] }, { name: "managerRole", type: "bytes32", internalType: "bytes32" }, { name: "adminRole", type: "bytes32", internalType: "bytes32" }] }], stateMutability: "view" }, { type: "function", name: "getRegistry", inputs: [], outputs: [{ name: "", type: "address", internalType: "contract IRegistry" }], stateMutability: "view" }, { type: "function", name: "getStrategy", inputs: [{ name: "_poolId", type: "uint256", internalType: "uint256" }], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "getTreasury", inputs: [], outputs: [{ name: "", type: "address", internalType: "address payable" }], stateMutability: "view" }, { type: "function", name: "initialize", inputs: [{ name: "_owner", type: "address", internalType: "address" }, { name: "_registry", type: "address", internalType: "address" }, { name: "_treasury", type: "address", internalType: "address payable" }, { name: "_percentFee", type: "uint256", internalType: "uint256" }, { name: "_baseFee", type: "uint256", internalType: "uint256" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "isCloneableStrategy", inputs: [{ name: "_strategy", type: "address", internalType: "address" }], outputs: [{ name: "", type: "bool", internalType: "bool" }], stateMutability: "view" }, { type: "function", name: "isPoolAdmin", inputs: [{ name: "_poolId", type: "uint256", internalType: "uint256" }, { name: "_address", type: "address", internalType: "address" }], outputs: [{ name: "", type: "bool", internalType: "bool" }], stateMutability: "view" }, { type: "function", name: "isPoolManager", inputs: [{ name: "_poolId", type: "uint256", internalType: "uint256" }, { name: "_address", type: "address", internalType: "address" }], outputs: [{ name: "", type: "bool", internalType: "bool" }], stateMutability: "view" }, { type: "function", name: "recoverFunds", inputs: [{ name: "_token", type: "address", internalType: "address" }, { name: "_recipient", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "registerRecipient", inputs: [{ name: "_poolId", type: "uint256", internalType: "uint256" }, { name: "_data", type: "bytes", internalType: "bytes" }], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "payable" }, { type: "function", name: "removeFromCloneableStrategies", inputs: [{ name: "_strategy", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "removePoolManager", inputs: [{ name: "_poolId", type: "uint256", internalType: "uint256" }, { name: "_manager", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "updateBaseFee", inputs: [{ name: "_baseFee", type: "uint256", internalType: "uint256" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "updatePercentFee", inputs: [{ name: "_percentFee", type: "uint256", internalType: "uint256" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "updatePoolMetadata", inputs: [{ name: "_poolId", type: "uint256", internalType: "uint256" }, { name: "_metadata", type: "tuple", internalType: "struct Metadata", components: [{ name: "protocol", type: "uint256", internalType: "uint256" }, { name: "pointer", type: "string", internalType: "string" }] }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "updateRegistry", inputs: [{ name: "_registry", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "updateTreasury", inputs: [{ name: "_treasury", type: "address", internalType: "address payable" }], outputs: [], stateMutability: "nonpayable" }, { type: "event", name: "BaseFeePaid", inputs: [{ name: "poolId", type: "uint256", indexed: true, internalType: "uint256" }, { name: "amount", type: "uint256", indexed: false, internalType: "uint256" }], anonymous: false }, { type: "event", name: "BaseFeeUpdated", inputs: [{ name: "baseFee", type: "uint256", indexed: false, internalType: "uint256" }], anonymous: false }, { type: "event", name: "PercentFeeUpdated", inputs: [{ name: "percentFee", type: "uint256", indexed: false, internalType: "uint256" }], anonymous: false }, { type: "event", name: "PoolCreated", inputs: [{ name: "poolId", type: "uint256", indexed: true, internalType: "uint256" }, { name: "profileId", type: "bytes32", indexed: true, internalType: "bytes32" }, { name: "strategy", type: "address", indexed: false, internalType: "contract IStrategy" }, { name: "token", type: "address", indexed: false, internalType: "address" }, { name: "amount", type: "uint256", indexed: false, internalType: "uint256" }, { name: "metadata", type: "tuple", indexed: false, internalType: "struct Metadata", components: [{ name: "protocol", type: "uint256", internalType: "uint256" }, { name: "pointer", type: "string", internalType: "string" }] }], anonymous: false }, { type: "event", name: "PoolFunded", inputs: [{ name: "poolId", type: "uint256", indexed: true, internalType: "uint256" }, { name: "amount", type: "uint256", indexed: false, internalType: "uint256" }, { name: "fee", type: "uint256", indexed: false, internalType: "uint256" }], anonymous: false }, { type: "event", name: "PoolMetadataUpdated", inputs: [{ name: "poolId", type: "uint256", indexed: true, internalType: "uint256" }, { name: "metadata", type: "tuple", indexed: false, internalType: "struct Metadata", components: [{ name: "protocol", type: "uint256", internalType: "uint256" }, { name: "pointer", type: "string", internalType: "string" }] }], anonymous: false }, { type: "event", name: "RegistryUpdated", inputs: [{ name: "registry", type: "address", indexed: false, internalType: "address" }], anonymous: false }, { type: "event", name: "StrategyApproved", inputs: [{ name: "strategy", type: "address", indexed: false, internalType: "address" }], anonymous: false }, { type: "event", name: "StrategyRemoved", inputs: [{ name: "strategy", type: "address", indexed: false, internalType: "address" }], anonymous: false }, { type: "event", name: "TreasuryUpdated", inputs: [{ name: "treasury", type: "address", indexed: false, internalType: "address" }], anonymous: false }];

// ../../pkg/contracts/abis/IArbitrator.sol/IArbitrator.json
var abi5 = [{ type: "function", name: "arbitrationCost", inputs: [{ name: "_extraData", type: "bytes", internalType: "bytes" }, { name: "_feeToken", type: "address", internalType: "contract IERC20" }], outputs: [{ name: "cost", type: "uint256", internalType: "uint256" }], stateMutability: "view" }, { type: "function", name: "arbitrationCost", inputs: [{ name: "_extraData", type: "bytes", internalType: "bytes" }], outputs: [{ name: "cost", type: "uint256", internalType: "uint256" }], stateMutability: "view" }, { type: "function", name: "createDispute", inputs: [{ name: "_numberOfChoices", type: "uint256", internalType: "uint256" }, { name: "_extraData", type: "bytes", internalType: "bytes" }], outputs: [{ name: "disputeID", type: "uint256", internalType: "uint256" }], stateMutability: "payable" }, { type: "function", name: "createDispute", inputs: [{ name: "_numberOfChoices", type: "uint256", internalType: "uint256" }, { name: "_extraData", type: "bytes", internalType: "bytes" }, { name: "_feeToken", type: "address", internalType: "contract IERC20" }, { name: "_feeAmount", type: "uint256", internalType: "uint256" }], outputs: [{ name: "disputeID", type: "uint256", internalType: "uint256" }], stateMutability: "nonpayable" }, { type: "function", name: "currentRuling", inputs: [{ name: "_disputeID", type: "uint256", internalType: "uint256" }], outputs: [{ name: "ruling", type: "uint256", internalType: "uint256" }, { name: "tied", type: "bool", internalType: "bool" }, { name: "overridden", type: "bool", internalType: "bool" }], stateMutability: "view" }, { type: "function", name: "registerSafe", inputs: [{ name: "_safe", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "event", name: "AcceptedFeeToken", inputs: [{ name: "_token", type: "address", indexed: true, internalType: "contract IERC20" }, { name: "_accepted", type: "bool", indexed: true, internalType: "bool" }], anonymous: false }, { type: "event", name: "DisputeCreation", inputs: [{ name: "_disputeID", type: "uint256", indexed: true, internalType: "uint256" }, { name: "_arbitrable", type: "address", indexed: true, internalType: "contract IArbitrable" }], anonymous: false }, { type: "event", name: "NewCurrencyRate", inputs: [{ name: "_feeToken", type: "address", indexed: true, internalType: "contract IERC20" }, { name: "_rateInEth", type: "uint64", indexed: false, internalType: "uint64" }, { name: "_rateDecimals", type: "uint8", indexed: false, internalType: "uint8" }], anonymous: false }, { type: "event", name: "Ruling", inputs: [{ name: "_arbitrable", type: "address", indexed: true, internalType: "contract IArbitrable" }, { name: "_disputeID", type: "uint256", indexed: true, internalType: "uint256" }, { name: "_ruling", type: "uint256", indexed: false, internalType: "uint256" }], anonymous: false }];

// ../../pkg/contracts/abis/MockERC20.sol/MockERC20.json
var abi6 = [{ type: "function", name: "DOMAIN_SEPARATOR", inputs: [], outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }], stateMutability: "view" }, { type: "function", name: "allowance", inputs: [{ name: "owner", type: "address", internalType: "address" }, { name: "spender", type: "address", internalType: "address" }], outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "view" }, { type: "function", name: "approve", inputs: [{ name: "spender", type: "address", internalType: "address" }, { name: "amount", type: "uint256", internalType: "uint256" }], outputs: [{ name: "", type: "bool", internalType: "bool" }], stateMutability: "nonpayable" }, { type: "function", name: "balanceOf", inputs: [{ name: "owner", type: "address", internalType: "address" }], outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "view" }, { type: "function", name: "decimals", inputs: [], outputs: [{ name: "", type: "uint8", internalType: "uint8" }], stateMutability: "view" }, { type: "function", name: "initialize", inputs: [{ name: "name_", type: "string", internalType: "string" }, { name: "symbol_", type: "string", internalType: "string" }, { name: "decimals_", type: "uint8", internalType: "uint8" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "name", inputs: [], outputs: [{ name: "", type: "string", internalType: "string" }], stateMutability: "view" }, { type: "function", name: "nonces", inputs: [{ name: "", type: "address", internalType: "address" }], outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "view" }, { type: "function", name: "permit", inputs: [{ name: "owner", type: "address", internalType: "address" }, { name: "spender", type: "address", internalType: "address" }, { name: "value", type: "uint256", internalType: "uint256" }, { name: "deadline", type: "uint256", internalType: "uint256" }, { name: "v", type: "uint8", internalType: "uint8" }, { name: "r", type: "bytes32", internalType: "bytes32" }, { name: "s", type: "bytes32", internalType: "bytes32" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "symbol", inputs: [], outputs: [{ name: "", type: "string", internalType: "string" }], stateMutability: "view" }, { type: "function", name: "totalSupply", inputs: [], outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "view" }, { type: "function", name: "transfer", inputs: [{ name: "to", type: "address", internalType: "address" }, { name: "amount", type: "uint256", internalType: "uint256" }], outputs: [{ name: "", type: "bool", internalType: "bool" }], stateMutability: "nonpayable" }, { type: "function", name: "transferFrom", inputs: [{ name: "from", type: "address", internalType: "address" }, { name: "to", type: "address", internalType: "address" }, { name: "amount", type: "uint256", internalType: "uint256" }], outputs: [{ name: "", type: "bool", internalType: "bool" }], stateMutability: "nonpayable" }, { type: "event", name: "Approval", inputs: [{ name: "owner", type: "address", indexed: true, internalType: "address" }, { name: "spender", type: "address", indexed: true, internalType: "address" }, { name: "value", type: "uint256", indexed: false, internalType: "uint256" }], anonymous: false }, { type: "event", name: "Transfer", inputs: [{ name: "from", type: "address", indexed: true, internalType: "address" }, { name: "to", type: "address", indexed: true, internalType: "address" }, { name: "value", type: "uint256", indexed: false, internalType: "uint256" }], anonymous: false }];

// ../../pkg/contracts/abis/PassportScorer.sol/PassportScorer.json
var abi7 = [{ type: "function", name: "activateStrategy", inputs: [{ name: "_strategy", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "addStrategy", inputs: [{ name: "_strategy", type: "address", internalType: "address" }, { name: "_threshold", type: "uint256", internalType: "uint256" }, { name: "_councilSafe", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "addUserScore", inputs: [{ name: "_user", type: "address", internalType: "address" }, { name: "_score", type: "uint256", internalType: "uint256" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "canExecuteAction", inputs: [{ name: "_user", type: "address", internalType: "address" }, { name: "_strategy", type: "address", internalType: "address" }], outputs: [{ name: "", type: "bool", internalType: "bool" }], stateMutability: "view" }, { type: "function", name: "changeListManager", inputs: [{ name: "_newManager", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "initialize", inputs: [{ name: "_listManager", type: "address", internalType: "address" }, { name: "_owner", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "initialize", inputs: [{ name: "initialOwner", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "listManager", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "modifyThreshold", inputs: [{ name: "_strategy", type: "address", internalType: "address" }, { name: "_newThreshold", type: "uint256", internalType: "uint256" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "owner", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "proxiableUUID", inputs: [], outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }], stateMutability: "view" }, { type: "function", name: "proxyOwner", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "removeStrategy", inputs: [{ name: "_strategy", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "removeUser", inputs: [{ name: "_user", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "renounceOwnership", inputs: [], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "strategies", inputs: [{ name: "", type: "address", internalType: "address" }], outputs: [{ name: "threshold", type: "uint256", internalType: "uint256" }, { name: "active", type: "bool", internalType: "bool" }, { name: "councilSafe", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "transferOwnership", inputs: [{ name: "newOwner", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "upgradeTo", inputs: [{ name: "newImplementation", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "upgradeToAndCall", inputs: [{ name: "newImplementation", type: "address", internalType: "address" }, { name: "data", type: "bytes", internalType: "bytes" }], outputs: [], stateMutability: "payable" }, { type: "function", name: "userScores", inputs: [{ name: "", type: "address", internalType: "address" }], outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "view" }, { type: "event", name: "AdminChanged", inputs: [{ name: "previousAdmin", type: "address", indexed: false, internalType: "address" }, { name: "newAdmin", type: "address", indexed: false, internalType: "address" }], anonymous: false }, { type: "event", name: "BeaconUpgraded", inputs: [{ name: "beacon", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "Initialized", inputs: [{ name: "version", type: "uint8", indexed: false, internalType: "uint8" }], anonymous: false }, { type: "event", name: "ListManagerChanged", inputs: [{ name: "oldManager", type: "address", indexed: true, internalType: "address" }, { name: "newManager", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "OwnershipTransferred", inputs: [{ name: "previousOwner", type: "address", indexed: true, internalType: "address" }, { name: "newOwner", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "StrategyActivated", inputs: [{ name: "strategy", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "StrategyAdded", inputs: [{ name: "strategy", type: "address", indexed: true, internalType: "address" }, { name: "threshold", type: "uint256", indexed: false, internalType: "uint256" }, { name: "active", type: "bool", indexed: false, internalType: "bool" }, { name: "councilSafe", type: "address", indexed: false, internalType: "address" }], anonymous: false }, { type: "event", name: "StrategyRemoved", inputs: [{ name: "strategy", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "ThresholdModified", inputs: [{ name: "strategy", type: "address", indexed: true, internalType: "address" }, { name: "newThreshold", type: "uint256", indexed: false, internalType: "uint256" }], anonymous: false }, { type: "event", name: "Upgraded", inputs: [{ name: "implementation", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "UserRemoved", inputs: [{ name: "user", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "UserScoreAdded", inputs: [{ name: "user", type: "address", indexed: true, internalType: "address" }, { name: "score", type: "uint256", indexed: false, internalType: "uint256" }], anonymous: false }, { type: "error", name: "CallerNotOwner", inputs: [{ name: "_caller", type: "address", internalType: "address" }, { name: "_owner", type: "address", internalType: "address" }] }, { type: "error", name: "OnlyAuthorized", inputs: [] }, { type: "error", name: "OnlyAuthorizedOrUser", inputs: [] }, { type: "error", name: "OnlyCouncil", inputs: [] }, { type: "error", name: "OnlyCouncilOrAuthorized", inputs: [] }, { type: "error", name: "StrategyAlreadyExists", inputs: [] }, { type: "error", name: "ZeroAddress", inputs: [] }];

// ../../pkg/contracts/abis/ProxyOwner.sol/ProxyOwner.json
var abi8 = [{ type: "constructor", inputs: [], stateMutability: "nonpayable" }, { type: "function", name: "acceptOwnership", inputs: [], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "grantUpgradeAccess", inputs: [{ name: "upgradeWallet", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "initialize", inputs: [{ name: "initialOwner", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "mainOwner", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "owner", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "pendingOwner", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "proxiableUUID", inputs: [], outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }], stateMutability: "view" }, { type: "function", name: "proxyOwner", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "reclaimUpgradeAccess", inputs: [], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "renounceOwnership", inputs: [], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "renounceUpgradeAccess", inputs: [], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "transferOwnership", inputs: [{ name: "newOwner", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "upgradeAccess", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "upgradeTo", inputs: [{ name: "newImplementation", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "upgradeToAndCall", inputs: [{ name: "newImplementation", type: "address", internalType: "address" }, { name: "data", type: "bytes", internalType: "bytes" }], outputs: [], stateMutability: "payable" }, { type: "event", name: "AdminChanged", inputs: [{ name: "previousAdmin", type: "address", indexed: false, internalType: "address" }, { name: "newAdmin", type: "address", indexed: false, internalType: "address" }], anonymous: false }, { type: "event", name: "BeaconUpgraded", inputs: [{ name: "beacon", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "Initialized", inputs: [{ name: "version", type: "uint8", indexed: false, internalType: "uint8" }], anonymous: false }, { type: "event", name: "OwnershipTransferStarted", inputs: [{ name: "previousOwner", type: "address", indexed: true, internalType: "address" }, { name: "newOwner", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "OwnershipTransferred", inputs: [{ name: "previousOwner", type: "address", indexed: true, internalType: "address" }, { name: "newOwner", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "UpgradeAccessGranted", inputs: [{ name: "owner", type: "address", indexed: true, internalType: "address" }, { name: "upgradeWallet", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "UpgradeAccessReclaimed", inputs: [{ name: "owner", type: "address", indexed: true, internalType: "address" }, { name: "previousUpgradeWallet", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "UpgradeAccessRenounced", inputs: [{ name: "upgradeWallet", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "Upgraded", inputs: [{ name: "implementation", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "error", name: "OwnableUnauthorizedAccount", inputs: [{ name: "account", type: "address", internalType: "address" }] }];

// ../../pkg/contracts/abis/RegistryFactory.sol/RegistryFactory.json
var abi9 = [{ type: "function", name: "VERSION", inputs: [], outputs: [{ name: "", type: "string", internalType: "string" }], stateMutability: "view" }, { type: "function", name: "authorizedWallets", inputs: [{ name: "", type: "address", internalType: "address" }], outputs: [{ name: "", type: "bool", internalType: "bool" }], stateMutability: "view" }, { type: "function", name: "clearCommunityFacetCuts", inputs: [], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "clearStrategyFacetCuts", inputs: [], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "collateralVaultTemplate", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "createRegistry", inputs: [{ name: "params", type: "tuple", internalType: "struct RegistryCommunityInitializeParams", components: [{ name: "_allo", type: "address", internalType: "address" }, { name: "_gardenToken", type: "address", internalType: "contract IERC20" }, { name: "_registerStakeAmount", type: "uint256", internalType: "uint256" }, { name: "_communityFee", type: "uint256", internalType: "uint256" }, { name: "_nonce", type: "uint256", internalType: "uint256" }, { name: "_registryFactory", type: "address", internalType: "address" }, { name: "_feeReceiver", type: "address", internalType: "address" }, { name: "_metadata", type: "tuple", internalType: "struct Metadata", components: [{ name: "protocol", type: "uint256", internalType: "uint256" }, { name: "pointer", type: "string", internalType: "string" }] }, { name: "_councilSafe", type: "address", internalType: "address payable" }, { name: "_communityName", type: "string", internalType: "string" }, { name: "_isKickEnabled", type: "bool", internalType: "bool" }, { name: "covenantIpfsHash", type: "string", internalType: "string" }] }], outputs: [{ name: "_createdRegistryAddress", type: "address", internalType: "address" }], stateMutability: "nonpayable" }, { type: "function", name: "delegateProtopian", inputs: [{ name: "from", type: "address", internalType: "address" }, { name: "to", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "gardensFeeReceiver", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "getCommunityFacets", inputs: [], outputs: [{ name: "facetCuts", type: "tuple[]", internalType: "struct IDiamond.FacetCut[]", components: [{ name: "facetAddress", type: "address", internalType: "address" }, { name: "action", type: "uint8", internalType: "enum IDiamond.FacetCutAction" }, { name: "functionSelectors", type: "bytes4[]", internalType: "bytes4[]" }] }, { name: "init", type: "address", internalType: "address" }, { name: "initCalldata", type: "bytes", internalType: "bytes" }], stateMutability: "view" }, { type: "function", name: "getCommunityValidity", inputs: [{ name: "_community", type: "address", internalType: "address" }], outputs: [{ name: "", type: "bool", internalType: "bool" }], stateMutability: "view" }, { type: "function", name: "getGardensFeeReceiver", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "getProtocolFee", inputs: [{ name: "_community", type: "address", internalType: "address" }], outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "view" }, { type: "function", name: "getStrategyFacets", inputs: [], outputs: [{ name: "facetCuts", type: "tuple[]", internalType: "struct IDiamond.FacetCut[]", components: [{ name: "facetAddress", type: "address", internalType: "address" }, { name: "action", type: "uint8", internalType: "enum IDiamond.FacetCutAction" }, { name: "functionSelectors", type: "bytes4[]", internalType: "bytes4[]" }] }, { name: "init", type: "address", internalType: "address" }, { name: "initCalldata", type: "bytes", internalType: "bytes" }], stateMutability: "view" }, { type: "function", name: "getStreamingEscrowFactory", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "globalPauseController", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "initialize", inputs: [{ name: "_owner", type: "address", internalType: "address" }, { name: "_gardensFeeReceiver", type: "address", internalType: "address" }, { name: "_registryCommunityTemplate", type: "address", internalType: "address" }, { name: "_strategyTemplate", type: "address", internalType: "address" }, { name: "_collateralVaultTemplate", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "initialize", inputs: [{ name: "initialOwner", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "isAuthorizedWallet", inputs: [{ name: "wallet", type: "address", internalType: "address" }], outputs: [{ name: "", type: "bool", internalType: "bool" }], stateMutability: "view" }, { type: "function", name: "isContractRegistered", inputs: [{ name: "target", type: "address", internalType: "address" }], outputs: [{ name: "", type: "bool", internalType: "bool" }], stateMutability: "view" }, { type: "function", name: "keepersAddresses", inputs: [{ name: "", type: "address", internalType: "address" }], outputs: [{ name: "", type: "bool", internalType: "bool" }], stateMutability: "view" }, { type: "function", name: "nonce", inputs: [], outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "view" }, { type: "function", name: "owner", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "protopianDelegate", inputs: [{ name: "", type: "address", internalType: "address" }], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "protopiansAddresses", inputs: [{ name: "", type: "address", internalType: "address" }], outputs: [{ name: "", type: "bool", internalType: "bool" }], stateMutability: "view" }, { type: "function", name: "proxiableUUID", inputs: [], outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }], stateMutability: "view" }, { type: "function", name: "proxyOwner", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "registerContract", inputs: [{ name: "target", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "registeredContracts", inputs: [{ name: "", type: "address", internalType: "address" }], outputs: [{ name: "", type: "bool", internalType: "bool" }], stateMutability: "view" }, { type: "function", name: "registryCommunityTemplate", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "renounceOwnership", inputs: [], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "setAuthorizedWallet", inputs: [{ name: "wallet", type: "address", internalType: "address" }, { name: "authorized", type: "bool", internalType: "bool" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "setCollateralVaultTemplate", inputs: [{ name: "template", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "setCommunityFacetInit", inputs: [{ name: "init", type: "address", internalType: "address" }, { name: "initCalldata", type: "bytes", internalType: "bytes" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "setCommunityFacets", inputs: [{ name: "communityFacetCuts_", type: "tuple[]", internalType: "struct IDiamond.FacetCut[]", components: [{ name: "facetAddress", type: "address", internalType: "address" }, { name: "action", type: "uint8", internalType: "enum IDiamond.FacetCutAction" }, { name: "functionSelectors", type: "bytes4[]", internalType: "bytes4[]" }] }, { name: "communityInit_", type: "address", internalType: "address" }, { name: "communityInitCalldata_", type: "bytes", internalType: "bytes" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "setCommunityValidity", inputs: [{ name: "_community", type: "address", internalType: "address" }, { name: "_isValid", type: "bool", internalType: "bool" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "setGlobalPauseController", inputs: [{ name: "controller", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "setKeeperAddress", inputs: [{ name: "_keepers", type: "address[]", internalType: "address[]" }, { name: "_isKeeper", type: "bool", internalType: "bool" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "setProtocolFee", inputs: [{ name: "_community", type: "address", internalType: "address" }, { name: "_newProtocolFee", type: "uint256", internalType: "uint256" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "setProtopianAddress", inputs: [{ name: "_protopians", type: "address[]", internalType: "address[]" }, { name: "_isProtopian", type: "bool", internalType: "bool" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "setReceiverAddress", inputs: [{ name: "_newFeeReceiver", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "setRegistryCommunityTemplate", inputs: [{ name: "template", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "setStrategyFacetInit", inputs: [{ name: "init", type: "address", internalType: "address" }, { name: "initCalldata", type: "bytes", internalType: "bytes" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "setStrategyFacets", inputs: [{ name: "strategyFacetCuts_", type: "tuple[]", internalType: "struct IDiamond.FacetCut[]", components: [{ name: "facetAddress", type: "address", internalType: "address" }, { name: "action", type: "uint8", internalType: "enum IDiamond.FacetCutAction" }, { name: "functionSelectors", type: "bytes4[]", internalType: "bytes4[]" }] }, { name: "strategyInit_", type: "address", internalType: "address" }, { name: "strategyInitCalldata_", type: "bytes", internalType: "bytes" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "setStrategyTemplate", inputs: [{ name: "template", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "setStreamingEscrowFactory", inputs: [{ name: "factory", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "strategyTemplate", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "streamingEscrowFactory", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "transferOwnership", inputs: [{ name: "newOwner", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "unregisterContract", inputs: [{ name: "target", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "upgradeTo", inputs: [{ name: "newImplementation", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "upgradeToAndCall", inputs: [{ name: "newImplementation", type: "address", internalType: "address" }, { name: "data", type: "bytes", internalType: "bytes" }], outputs: [], stateMutability: "payable" }, { type: "function", name: "upsertCommunityFacetCut", inputs: [{ name: "index", type: "uint256", internalType: "uint256" }, { name: "facetAddress", type: "address", internalType: "address" }, { name: "action", type: "uint8", internalType: "enum IDiamond.FacetCutAction" }, { name: "selectors", type: "bytes4[]", internalType: "bytes4[]" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "upsertStrategyFacetCut", inputs: [{ name: "index", type: "uint256", internalType: "uint256" }, { name: "facetAddress", type: "address", internalType: "address" }, { name: "action", type: "uint8", internalType: "enum IDiamond.FacetCutAction" }, { name: "selectors", type: "bytes4[]", internalType: "bytes4[]" }], outputs: [], stateMutability: "nonpayable" }, { type: "event", name: "AdminChanged", inputs: [{ name: "previousAdmin", type: "address", indexed: false, internalType: "address" }, { name: "newAdmin", type: "address", indexed: false, internalType: "address" }], anonymous: false }, { type: "event", name: "AuthorizedWalletSet", inputs: [{ name: "wallet", type: "address", indexed: true, internalType: "address" }, { name: "authorized", type: "bool", indexed: false, internalType: "bool" }], anonymous: false }, { type: "event", name: "BeaconUpgraded", inputs: [{ name: "beacon", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "CommunityCreated", inputs: [{ name: "_registryCommunity", type: "address", indexed: false, internalType: "address" }], anonymous: false }, { type: "event", name: "CommunityValiditySet", inputs: [{ name: "_community", type: "address", indexed: false, internalType: "address" }, { name: "_isValid", type: "bool", indexed: false, internalType: "bool" }], anonymous: false }, { type: "event", name: "ContractRegistered", inputs: [{ name: "target", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "ContractUnregistered", inputs: [{ name: "target", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "FeeReceiverSet", inputs: [{ name: "_newFeeReceiver", type: "address", indexed: false, internalType: "address" }], anonymous: false }, { type: "event", name: "GlobalPauseControllerSet", inputs: [{ name: "_newController", type: "address", indexed: false, internalType: "address" }], anonymous: false }, { type: "event", name: "Initialized", inputs: [{ name: "version", type: "uint8", indexed: false, internalType: "uint8" }], anonymous: false }, { type: "event", name: "KeepersChanged", inputs: [{ name: "_new", type: "address[]", indexed: false, internalType: "address[]" }, { name: "_removed", type: "address[]", indexed: false, internalType: "address[]" }], anonymous: false }, { type: "event", name: "OwnershipTransferred", inputs: [{ name: "previousOwner", type: "address", indexed: true, internalType: "address" }, { name: "newOwner", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "ProtocolFeeSet", inputs: [{ name: "_community", type: "address", indexed: false, internalType: "address" }, { name: "_newProtocolFee", type: "uint256", indexed: false, internalType: "uint256" }], anonymous: false }, { type: "event", name: "ProtopianDelegated", inputs: [{ name: "from", type: "address", indexed: true, internalType: "address" }, { name: "to", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "ProtopiansChanged", inputs: [{ name: "_new", type: "address[]", indexed: false, internalType: "address[]" }, { name: "_removed", type: "address[]", indexed: false, internalType: "address[]" }], anonymous: false }, { type: "event", name: "StreamingEscrowFactorySet", inputs: [{ name: "_newFactory", type: "address", indexed: false, internalType: "address" }], anonymous: false }, { type: "event", name: "Upgraded", inputs: [{ name: "implementation", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "error", name: "AddressCannotBeZero", inputs: [] }, { type: "error", name: "CallerNotOwner", inputs: [{ name: "_caller", type: "address", internalType: "address" }, { name: "_owner", type: "address", internalType: "address" }] }, { type: "error", name: "CommunityInvalid", inputs: [{ name: "_community", type: "address", internalType: "address" }] }, { type: "error", name: "ProtopianHolderRequired", inputs: [{ name: "from", type: "address", internalType: "address" }] }, { type: "error", name: "UnauthorizedProtopianDelegation", inputs: [{ name: "caller", type: "address", internalType: "address" }, { name: "from", type: "address", internalType: "address" }] }];

// ../../pkg/contracts/abis/SafeArbitrator.sol/SafeArbitrator.json
var abi10 = [{ type: "function", name: "arbitrableTribunalSafe", inputs: [{ name: "arbitrable", type: "address", internalType: "address" }], outputs: [{ name: "safe", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "arbitrationCost", inputs: [{ name: "", type: "bytes", internalType: "bytes" }, { name: "", type: "address", internalType: "contract IERC20" }], outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "view" }, { type: "function", name: "arbitrationCost", inputs: [{ name: "", type: "bytes", internalType: "bytes" }], outputs: [{ name: "fee", type: "uint256", internalType: "uint256" }], stateMutability: "view" }, { type: "function", name: "createDispute", inputs: [{ name: "_choices", type: "uint256", internalType: "uint256" }, { name: "_extraData", type: "bytes", internalType: "bytes" }], outputs: [{ name: "disputeID", type: "uint256", internalType: "uint256" }], stateMutability: "payable" }, { type: "function", name: "createDispute", inputs: [{ name: "", type: "uint256", internalType: "uint256" }, { name: "", type: "bytes", internalType: "bytes" }, { name: "", type: "address", internalType: "contract IERC20" }, { name: "", type: "uint256", internalType: "uint256" }], outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "pure" }, { type: "function", name: "currentRuling", inputs: [{ name: "_disputeID", type: "uint256", internalType: "uint256" }], outputs: [{ name: "ruling", type: "uint256", internalType: "uint256" }, { name: "tied", type: "bool", internalType: "bool" }, { name: "overridden", type: "bool", internalType: "bool" }], stateMutability: "view" }, { type: "function", name: "disputes", inputs: [{ name: "", type: "uint256", internalType: "uint256" }], outputs: [{ name: "arbitrated", type: "address", internalType: "contract IArbitrable" }, { name: "arbitratorExtraData", type: "bytes", internalType: "bytes" }, { name: "choices", type: "uint256", internalType: "uint256" }, { name: "arbitrationFee", type: "uint256", internalType: "uint256" }, { name: "ruling", type: "uint256", internalType: "uint256" }, { name: "status", type: "uint8", internalType: "enum SafeArbitrator.DisputeStatus" }, { name: "tribunalSafe", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "executeRuling", inputs: [{ name: "_disputeID", type: "uint256", internalType: "uint256" }, { name: "_ruling", type: "uint256", internalType: "uint256" }, { name: "_arbitrable", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "initialize", inputs: [{ name: "initialOwner", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "initialize", inputs: [{ name: "_arbitrationFee", type: "uint256", internalType: "uint256" }, { name: "_owner", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "owner", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "proxiableUUID", inputs: [], outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }], stateMutability: "view" }, { type: "function", name: "proxyOwner", inputs: [], outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view" }, { type: "function", name: "registerSafe", inputs: [{ name: "_safe", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "renounceOwnership", inputs: [], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "setArbitrationFee", inputs: [{ name: "_arbitrationFee", type: "uint256", internalType: "uint256" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "transferOwnership", inputs: [{ name: "newOwner", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "upgradeTo", inputs: [{ name: "newImplementation", type: "address", internalType: "address" }], outputs: [], stateMutability: "nonpayable" }, { type: "function", name: "upgradeToAndCall", inputs: [{ name: "newImplementation", type: "address", internalType: "address" }, { name: "data", type: "bytes", internalType: "bytes" }], outputs: [], stateMutability: "payable" }, { type: "event", name: "AcceptedFeeToken", inputs: [{ name: "_token", type: "address", indexed: true, internalType: "contract IERC20" }, { name: "_accepted", type: "bool", indexed: true, internalType: "bool" }], anonymous: false }, { type: "event", name: "AdminChanged", inputs: [{ name: "previousAdmin", type: "address", indexed: false, internalType: "address" }, { name: "newAdmin", type: "address", indexed: false, internalType: "address" }], anonymous: false }, { type: "event", name: "ArbitrationFeeUpdated", inputs: [{ name: "_newArbitrationFee", type: "uint256", indexed: false, internalType: "uint256" }], anonymous: false }, { type: "event", name: "BeaconUpgraded", inputs: [{ name: "beacon", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "DisputeCreation", inputs: [{ name: "_disputeID", type: "uint256", indexed: true, internalType: "uint256" }, { name: "_arbitrable", type: "address", indexed: true, internalType: "contract IArbitrable" }], anonymous: false }, { type: "event", name: "Initialized", inputs: [{ name: "version", type: "uint8", indexed: false, internalType: "uint8" }], anonymous: false }, { type: "event", name: "NewCurrencyRate", inputs: [{ name: "_feeToken", type: "address", indexed: true, internalType: "contract IERC20" }, { name: "_rateInEth", type: "uint64", indexed: false, internalType: "uint64" }, { name: "_rateDecimals", type: "uint8", indexed: false, internalType: "uint8" }], anonymous: false }, { type: "event", name: "OwnershipTransferred", inputs: [{ name: "previousOwner", type: "address", indexed: true, internalType: "address" }, { name: "newOwner", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "event", name: "Ruling", inputs: [{ name: "_arbitrable", type: "address", indexed: true, internalType: "contract IArbitrable" }, { name: "_disputeID", type: "uint256", indexed: true, internalType: "uint256" }, { name: "_ruling", type: "uint256", indexed: false, internalType: "uint256" }], anonymous: false }, { type: "event", name: "SafeArbitratorInitialized", inputs: [{ name: "_arbitrationFee", type: "uint256", indexed: false, internalType: "uint256" }], anonymous: false }, { type: "event", name: "SafeRegistered", inputs: [{ name: "_arbitrable", type: "address", indexed: true, internalType: "address" }, { name: "_safe", type: "address", indexed: false, internalType: "address" }], anonymous: false }, { type: "event", name: "Upgraded", inputs: [{ name: "implementation", type: "address", indexed: true, internalType: "address" }], anonymous: false }, { type: "error", name: "CallerNotOwner", inputs: [{ name: "_caller", type: "address", internalType: "address" }, { name: "_owner", type: "address", internalType: "address" }] }, { type: "error", name: "DisputeAlreadySolved", inputs: [] }, { type: "error", name: "InvalidDisputeId", inputs: [{ name: "disputeId", type: "uint256", internalType: "uint256" }] }, { type: "error", name: "InvalidRuling", inputs: [] }, { type: "error", name: "NotEnoughArbitrationFees", inputs: [] }, { type: "error", name: "NotSupported", inputs: [] }, { type: "error", name: "OnlySafe", inputs: [{ name: "sender", type: "address", internalType: "address" }, { name: "safe", type: "address", internalType: "address" }] }];

// wagmi.config.ts
var wagmi_config_default = defineConfig({
  out: "src/generated.ts",
  contracts: [
    {
      name: "ERC20",
      abi: abi6
    },
    {
      name: "CVStrategy",
      abi
    },
    {
      name: "RegistryFactory",
      abi: abi9
    },
    {
      name: "RegistryCommunity",
      abi: abi2
    },
    {
      name: "Allo",
      abi: abi4
    },
    {
      name: "PassportScorer",
      abi: abi7
    },
    {
      name: "ProxyOwner",
      abi: abi8
    },
    {
      name: "IArbitrator",
      abi: abi5
    },
    {
      name: "SafeArbitrator",
      abi: abi10
    },
    {
      name: "GoodDollar",
      abi: abi3
    }
  ],
  plugins: [
    actions({
      watchContractEvent: false,
      readContract: true,
      writeContract: true,
      prepareWriteContract: true,
      getContract: true
    })
  ]
});
export {
  wagmi_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsid2FnbWkuY29uZmlnLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX2luamVjdGVkX2ZpbGVuYW1lX18gPSBcIi9ob21lL2NvcmFudGluL0RvY3VtZW50cy9HaXRIdWIvZ2FyZGVucy12Mi9hcHBzL3dlYi93YWdtaS5jb25maWcudHNcIjtjb25zdCBfX2luamVjdGVkX2Rpcm5hbWVfXyA9IFwiL2hvbWUvY29yYW50aW4vRG9jdW1lbnRzL0dpdEh1Yi9nYXJkZW5zLXYyL2FwcHMvd2ViXCI7Y29uc3QgX19pbmplY3RlZF9pbXBvcnRfbWV0YV91cmxfXyA9IFwiZmlsZTovLy9ob21lL2NvcmFudGluL0RvY3VtZW50cy9HaXRIdWIvZ2FyZGVucy12Mi9hcHBzL3dlYi93YWdtaS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwiQHdhZ21pL2NsaVwiO1xuaW1wb3J0IHsgYWN0aW9ucyB9IGZyb20gXCJAd2FnbWkvY2xpL3BsdWdpbnNcIjtcbmltcG9ydCB7IEFiaSB9IGZyb20gXCJ2aWVtXCI7XG4vLyBVc2UgYWdncmVnYXRlZCBkaWFtb25kIEFCSXMgdGhhdCBpbmNsdWRlIGFsbCBmYWNldCBmdW5jdGlvbnNcbmltcG9ydCB7IGFiaSBhcyBDVlN0cmF0ZWd5QUJJIH0gZnJvbSBcIiMvY29udHJhY3RzL2FiaXMvRGlhbW9uZEFnZ3JlZ2F0ZWQvQ1ZTdHJhdGVneS5qc29uXCI7XG5pbXBvcnQgeyBhYmkgYXMgcmVnaXN0cnlDb21pdHlBQkkgfSBmcm9tIFwiIy9jb250cmFjdHMvYWJpcy9EaWFtb25kQWdncmVnYXRlZC9SZWdpc3RyeUNvbW11bml0eS5qc29uXCI7XG5pbXBvcnQgeyBhYmkgYXMgR29vZERvbGxhckFCSSB9IGZyb20gXCIjL2NvbnRyYWN0cy9hYmlzL0dvb2REb2xsYXJTeWJpbC5zb2wvR29vZERvbGxhclN5YmlsLmpzb25cIjtcbmltcG9ydCB7IGFiaSBhcyBhbGxvQUJJIH0gZnJvbSBcIiMvY29udHJhY3RzL2FiaXMvSUFsbG8uc29sL0lBbGxvLmpzb25cIjtcbmltcG9ydCB7IGFiaSBhcyBBcmJpdHJhdG9yQWJpIH0gZnJvbSBcIiMvY29udHJhY3RzL2FiaXMvSUFyYml0cmF0b3Iuc29sL0lBcmJpdHJhdG9yLmpzb25cIjtcbmltcG9ydCB7IGFiaSBhcyBtb2NrRVJDMjBBQkkgfSBmcm9tIFwiIy9jb250cmFjdHMvYWJpcy9Nb2NrRVJDMjAuc29sL01vY2tFUkMyMC5qc29uXCI7XG5pbXBvcnQgeyBhYmkgYXMgUGFzc3BvcnRTY29yZXJBQkkgfSBmcm9tIFwiIy9jb250cmFjdHMvYWJpcy9QYXNzcG9ydFNjb3Jlci5zb2wvUGFzc3BvcnRTY29yZXIuanNvblwiO1xuaW1wb3J0IHsgYWJpIGFzIFByb3h5T3duZXJBQkkgfSBmcm9tIFwiIy9jb250cmFjdHMvYWJpcy9Qcm94eU93bmVyLnNvbC9Qcm94eU93bmVyLmpzb25cIjtcbi8vIFVzZSBhZ2dyZWdhdGVkIGRpYW1vbmQgQUJJcyB0aGF0IGluY2x1ZGUgYWxsIGZhY2V0IGZ1bmN0aW9uc1xuaW1wb3J0IHsgYWJpIGFzIHJlZ2lzdHJ5RmFjdG9yeUFCSSB9IGZyb20gXCIjL2NvbnRyYWN0cy9hYmlzL1JlZ2lzdHJ5RmFjdG9yeS5zb2wvUmVnaXN0cnlGYWN0b3J5Lmpzb25cIjtcbmltcG9ydCB7IGFiaSBhcyBTYWZlQXJiaXRyYXRvciB9IGZyb20gXCIjL2NvbnRyYWN0cy9hYmlzL1NhZmVBcmJpdHJhdG9yLnNvbC9TYWZlQXJiaXRyYXRvci5qc29uXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIG91dDogXCJzcmMvZ2VuZXJhdGVkLnRzXCIsXG4gIGNvbnRyYWN0czogW1xuICAgIHtcbiAgICAgIG5hbWU6IFwiRVJDMjBcIixcbiAgICAgIGFiaTogbW9ja0VSQzIwQUJJIGFzIEFiaSxcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6IFwiQ1ZTdHJhdGVneVwiLFxuICAgICAgYWJpOiBDVlN0cmF0ZWd5QUJJIGFzIEFiaSxcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6IFwiUmVnaXN0cnlGYWN0b3J5XCIsXG4gICAgICBhYmk6IHJlZ2lzdHJ5RmFjdG9yeUFCSSBhcyBBYmksXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiBcIlJlZ2lzdHJ5Q29tbXVuaXR5XCIsXG4gICAgICBhYmk6IHJlZ2lzdHJ5Q29taXR5QUJJIGFzIEFiaSxcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6IFwiQWxsb1wiLFxuICAgICAgYWJpOiBhbGxvQUJJIGFzIEFiaSxcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6IFwiUGFzc3BvcnRTY29yZXJcIixcbiAgICAgIGFiaTogUGFzc3BvcnRTY29yZXJBQkkgYXMgQWJpLFxuICAgIH0sXG4gICAge1xuICAgICAgbmFtZTogXCJQcm94eU93bmVyXCIsXG4gICAgICBhYmk6IFByb3h5T3duZXJBQkkgYXMgQWJpLFxuICAgIH0sXG4gICAge1xuICAgICAgbmFtZTogXCJJQXJiaXRyYXRvclwiLFxuICAgICAgYWJpOiBBcmJpdHJhdG9yQWJpIGFzIEFiaSxcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6IFwiU2FmZUFyYml0cmF0b3JcIixcbiAgICAgIGFiaTogU2FmZUFyYml0cmF0b3IgYXMgQWJpLFxuICAgIH0sXG4gICAge1xuICAgICAgbmFtZTogXCJHb29kRG9sbGFyXCIsXG4gICAgICBhYmk6IEdvb2REb2xsYXJBQkkgYXMgQWJpLFxuICAgIH0sXG4gIF0sXG4gIHBsdWdpbnM6IFtcbiAgICBhY3Rpb25zKHtcbiAgICAgIHdhdGNoQ29udHJhY3RFdmVudDogZmFsc2UsXG4gICAgICByZWFkQ29udHJhY3Q6IHRydWUsXG4gICAgICB3cml0ZUNvbnRyYWN0OiB0cnVlLFxuICAgICAgcHJlcGFyZVdyaXRlQ29udHJhY3Q6IHRydWUsXG4gICAgICBnZXRDb250cmFjdDogdHJ1ZSxcbiAgICB9KSxcbiAgICAvLyBldGhlcnNjYW4oe1xuICAgIC8vICAgYXBpS2V5OiBwcm9jZXNzLmVudi5FVEhFUlNDQU5fQVBJX0tFWSEsXG4gICAgLy8gICBjaGFpbklkOiBtYWlubmV0LmlkLFxuICAgIC8vICAgY29udHJhY3RzOiBbXG4gICAgLy8gICAgIC8vIHtcbiAgICAvLyAgICAgLy8gICBuYW1lOiAnRW5zUmVnaXN0cnknLFxuICAgIC8vICAgICAvLyAgIGFkZHJlc3M6IHtcbiAgICAvLyAgICAgLy8gICAgIFttYWlubmV0LmlkXTogJzB4MzE0MTU5MjY1ZGQ4ZGJiMzEwNjQyZjk4ZjUwYzA2NjE3M2MxMjU5YicsXG4gICAgLy8gICAgIC8vICAgICBbc2Vwb2xpYS5pZF06ICcweDExMjIzNDQ1NWMzYTMyZmQxMTIzMGM0MmU3YmNjZDRhODRlMDIwMTAnLFxuICAgIC8vICAgICAvLyAgIH0sXG4gICAgLy8gICAgIC8vIH0sXG4gICAgLy8gICBdLFxuICAgIC8vIH0pLFxuICAgIC8vIGZvdW5kcnkoe1xuICAgIC8vICAgcHJvamVjdDogXCIuLi8uLi9cIixcbiAgICAvLyAgIGluY2x1ZGU6IFtcbiAgICAvLyAgICAgXCJDVlN0cmF0ZWd5LnNvbFwiLFxuICAgIC8vICAgICBcIlJlZ2lzdHJ5RmFjdG9yeS5zb2xcIixcbiAgICAvLyAgICAgXCJSZWdpc3RyeUdhcmRlbnMuc29sXCIsXG4gICAgLy8gICAgIFwiQWxsby5zb2xcIixcbiAgICAvLyAgIF0sXG4gICAgLy8gfSksXG4gICAgLy8gcmVhY3QoKSxcbiAgXSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5UyxTQUFTLG9CQUFvQjtBQUN0VSxTQUFTLGVBQWU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWV4QixJQUFPLHVCQUFRLGFBQWE7QUFBQSxFQUMxQixLQUFLO0FBQUEsRUFDTCxXQUFXO0FBQUEsSUFDVDtBQUFBLE1BQ0UsTUFBTTtBQUFBLE1BQ04sS0FBS0E7QUFBQSxJQUNQO0FBQUEsSUFDQTtBQUFBLE1BQ0UsTUFBTTtBQUFBLE1BQ047QUFBQSxJQUNGO0FBQUEsSUFDQTtBQUFBLE1BQ0UsTUFBTTtBQUFBLE1BQ04sS0FBS0E7QUFBQSxJQUNQO0FBQUEsSUFDQTtBQUFBLE1BQ0UsTUFBTTtBQUFBLE1BQ04sS0FBS0E7QUFBQSxJQUNQO0FBQUEsSUFDQTtBQUFBLE1BQ0UsTUFBTTtBQUFBLE1BQ04sS0FBS0E7QUFBQSxJQUNQO0FBQUEsSUFDQTtBQUFBLE1BQ0UsTUFBTTtBQUFBLE1BQ04sS0FBS0E7QUFBQSxJQUNQO0FBQUEsSUFDQTtBQUFBLE1BQ0UsTUFBTTtBQUFBLE1BQ04sS0FBS0E7QUFBQSxJQUNQO0FBQUEsSUFDQTtBQUFBLE1BQ0UsTUFBTTtBQUFBLE1BQ04sS0FBS0E7QUFBQSxJQUNQO0FBQUEsSUFDQTtBQUFBLE1BQ0UsTUFBTTtBQUFBLE1BQ04sS0FBS0E7QUFBQSxJQUNQO0FBQUEsSUFDQTtBQUFBLE1BQ0UsTUFBTTtBQUFBLE1BQ04sS0FBS0E7QUFBQSxJQUNQO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsUUFBUTtBQUFBLE1BQ04sb0JBQW9CO0FBQUEsTUFDcEIsY0FBYztBQUFBLE1BQ2QsZUFBZTtBQUFBLE1BQ2Ysc0JBQXNCO0FBQUEsTUFDdEIsYUFBYTtBQUFBLElBQ2YsQ0FBQztBQUFBLEVBd0JIO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFsiYWJpIl0KfQo=
