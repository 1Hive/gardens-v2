import { createContext } from "react";

type Proposals = {
  id: number;
  title: string;
  description: string;
  type: "funding" | "streaming" | "signaling";
  status: string;
  requestedAmount?: number;
  beneficiary?: string;
  createdBy?: string;
  points: {
    support: number;
    conviction: number;
    needed: number;
  }[];
  supporters: {
    address: string;
    amount: number;
  }[];
};

const proposals: Proposals[] = [
  {
    id: 1,
    title: "Gardens Swarm December 2023 Funding Proposal",
    description:
      "This is a proposal to fund the Gardens Swarm for the month of December 2023. This is a proposal to fund the Gardens Swarm for the month of December 2023. This is a proposal to fund the Gardens Swarm for the month of December 2023. This is a proposal to fund the Gardens Swarm for the month of December 2023.",
    type: "funding",
    status: "active",
    requestedAmount: 1000,
    beneficiary: "0x809c9f8dd8ca93a41c3adca4972fa234c28f7714",
    createdBy: "0x809c9f8dd8ca93a41c3adca4972fa234c28f7714",
    points: [
      {
        support: 100,
        conviction: 40,
        needed: 300,
      },
    ],
    supporters: [
      {
        address: "0xf46c2a3c093Ecf5c8F9b0B76e0A449f42739A25b",
        amount: 60,
      },
      {
        address: "0xafa295571dEB2b5A5E5038ea826C9FD18deAc9D5",
        amount: 20,
      },
      {
        address: "0xb06ad105556C06d1aF2065da630FD37a34524773",
        amount: 40,
      },
    ],
  },
  {
    id: 2,
    title: "Fluid Proposal paul active contributor",
    description:
      "I’ve been a full time web3 contributor since April 2021, working mostly on 1Hive and all the cool stuff getting built here.",
    type: "streaming",
    status: "active",
    beneficiary: "0x809c9f8dd8ca93a41c3adca4972fa234c28f7714",
    createdBy: "0x809c9f8dd8ca93a41c3adca4972fa234c28f7714",
    points: [
      {
        support: 100,
        conviction: 40,
        needed: 300,
      },
    ],
    supporters: [
      {
        address: "0xf46c2a3c093Ecf5c8F9b0B76e0A449f42739A25b",
        amount: 20,
      },
      {
        address: "0x5BE8Bb8d7923879c3DDc9c551C5Aa85Ad0Fa4dE3",
        amount: 35,
      },
      {
        address: "0x4415B01468a8cc03101E7952B3DE1cD980c827B4",
        amount: 45,
      },
    ],
  },
  {
    id: 3,
    title: "Signaling example",
    description: "this is a description of the example",
    type: "signaling",
    status: "active",
    points: [
      {
        support: 100,
        conviction: 40,
        needed: 300,
      },
    ],
    supporters: [
      {
        address: "0xf46c2a3c093Ecf5c8F9b0B76e0A449f42739A25b",
        amount: 30,
      },
      {
        address: "0xA82e58192E7861526AF80DB6252B247c058D00cD",
        amount: 50,
      },
      {
        address: "0x4415B01468a8cc03101E7952B3DE1cD980c827B4",
        amount: 60,
      },
    ],
  },
];
export const ProposalContext = createContext({ proposals });

export const ProposalProvider = ({ children }: any) => {
  return (
    <ProposalContext.Provider value={{ proposals }}>
      {children}
    </ProposalContext.Provider>
  );
};
