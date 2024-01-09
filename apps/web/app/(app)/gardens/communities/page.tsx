"use client";
import { honeyIcon, gardenLand } from "@/assets";
import Image from "next/image";
import { CommunityCard } from "@/components";
import { useContractRead, useContractReads } from "wagmi";
import { Abi } from "viem";
import CVStrategyABI from "#/contracts/out/CVStrategy.sol/CVStrategy.json";
import { contractsAddresses, alloContract } from "@/constants/contracts";

export default function Garden() {
  const alloContractReads = {
    address: contractsAddresses.allo,
    abi: alloContract.abi as Abi,
    onError: (error: any) => {
      console.log(error);
    },
    onSettled: (data: any) => {
      console.log(data);
    },
  };
  const { data, isLoading, isError, error } = useContractReads({
    contracts: [
      {
        ...alloContractReads,
        functionName: "getPool",
        args: [1],
      },
      {
        ...alloContractReads,
        functionName: "getPool",
        args: [2],
      },
    ],
  });

  // Check if there is data available for the first community
  if (data && data.length > 0) {
    // Merge the data into the first community - 1hive
    const firstCommunity = conmmunities[0];
    firstCommunity.pools.forEach((pool, poolIndex) => {
      if (data[poolIndex]) {
        pool.result = data[poolIndex].result;
        pool.status = data[poolIndex].status;
      }
    });
  }

  console.log(conmmunities);
  return (
    <div className=" relative mx-auto max-w-5xl space-y-10 rounded-xl border-2 border-black bg-base-100 bg-surface p-8">
      {/* header: honey logo +stats */}
      <header className="flex items-center justify-between gap-4  py-6">
        <div className="flex w-44 items-center justify-center gap-2">
          <Image src={honeyIcon} alt="honey icon" className="h-20 w-20" />
          <span className="text-2xl font-bold">HNY</span>
        </div>
        <div className="flex flex-1">
          {stats.map((stat, i) => (
            <div
              className="flex w-full flex-col items-center justify-center gap-2"
              key={stat.label + i}
            >
              <span className="text-3xl font-semibold text-info">
                {stat.label}
              </span>
              <span className="text-xl font-bold">{stat.value}</span>
            </div>
          ))}
        </div>
      </header>
      <section className="mx-auto flex flex-col gap-8">
        {/* communites */}
        {conmmunities.map((community, i) => (
          <CommunityCard {...community} key={community.name + i} />
        ))}
      </section>
    </div>
  );
}

const stats = [
  {
    label: "Price",
    value: "11.4",
  },
  {
    label: "Total Supply",
    value: "49,126",
  },
  {
    label: "Total Support",
    value: "8,649 ",
  },
];

interface Pool {
  name: string;
  strategy: string;
  proposals: number;
  href: string;
  result?: any;
  status?: any; // Add this line to allow the 'result' property
}

interface Community {
  name: string;
  address: string;
  href: string;
  pools: Pool[];
}

const conmmunities: Community[] = [
  {
    name: "1Hive",
    address: "0x...",
    href: "1hive",
    pools: [
      {
        name: "Pool 1",
        strategy: "C.V",
        proposals: 3,
        href: "1",
      },
      {
        name: "Pool 2",
        strategy: "C.V",
        proposals: 3,
        href: "2",
      },
    ],
  },
  {
    name: "Memecoins",
    address: "0x...",
    href: "#",
    pools: [
      {
        name: "Pool 1",
        strategy: "C.V",
        proposals: 5,
      },
      {
        name: "Pool 2",
        strategy: "quest",
        proposals: 2,
      },
    ],
  },
  {
    name: "1hive Foundation DAO",
    address: "0x...",
    href: "#",
    pools: [
      {
        name: "Pool 1",
        strategy: "C.V",
        proposals: 2,
      },
      {
        name: "Pool 2",
        strategy: "quest",
        proposals: 3,
      },
      {
        name: "Pool 3",
        strategy: "C.V",
        proposals: 1,
      },
    ],
  },
  {
    name: "1hive Gardens Swarm",
    address: "0x...",
    href: "#",
    pools: [
      {
        name: "Pool 1",
        strategy: "C.V",
        proposals: 8,
      },
    ],
  },
];

//contracts:
// {
//   ...alloContractReads,
//   functionName: "isPoolManager",
//   args: [2, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
// },
// {
//   ...alloContractReads,
//   functionName: "getStrategy",
//   args: [1],
// },
// {
//   ...alloContractReads,
//   functionName: "getTreasury",
// },

// {
//   name: "Pool 3",
//   strategy: "C.V",
//   proposals: 2,
//   href: "3",
// },
// {
//   name: "Pool 4",
//   strategy: "C.V",
//   proposals: 3,
//   href: "4",
// },
// {
//   name: "Pool 5",
//   strategy: "C.V",
//   proposals: 6,
//   href: "5",
// },
// {
//   name: "Pool 6",
//   strategy: "C.V",
//   proposals: 2,
//   href: "6",
// },
// {
//   name: "Pool 7",
//   strategy: "C.V",
//   proposals: 3,
//   href: "7",
// },
// {
//   name: "Pool 8",
//   strategy: "C.V",
//   proposals: 6,
//   href: "8",
// },
