import { honeyIcon } from "@/assets";
import Image from "next/image";
import { CommunityCard } from "@/components";
import { useContractRead, readContracts } from "wagmi";
import { Abi } from "viem";
import { contractsAddresses } from "@/constants/contracts";
import { alloAbi } from "@/src/generated";

export default async function Garden() {
  const alloContractReadProps = {
    address: contractsAddresses.allo,
    abi: alloAbi as Abi,
  };

  try {
    // await readContracts(wagmiConfig,
    const result = await readContracts({
      contracts: [
        {
          ...alloContractReadProps,
          functionName: "getPool",
          args: [1],
        },
        {
          ...alloContractReadProps,
          functionName: "getPool",
          args: [2],
        },
      ],
    });

    // Merge the data into the first community - 1hive
    conmmunities[0].pools.forEach((pool, poolIndex) => {
      if (result[poolIndex]) {
        pool.result = result[poolIndex].result;
        pool.status = result[poolIndex].status;
      }
    });
  } catch (error) {
    console.log(error);
  }

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
        href: `${contractsAddresses.poolID}`,
      },
      {
        name: "Pool 2",
        strategy: "C.V",
        proposals: 3,
        href: `${contractsAddresses.poolID + 1}`,
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
        proposals: 3,
        href: `${contractsAddresses.poolID}`,
      },
      {
        name: "Pool 2",
        strategy: "C.V",
        proposals: 3,
        href: `${contractsAddresses.poolID + 1}`,
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
        proposals: 3,
        href: `${contractsAddresses.poolID}`,
      },
      {
        name: "Pool 2",
        strategy: "C.V",
        proposals: 3,
        href: `${contractsAddresses.poolID + 1}`,
      },
      // {
      //   name: "Pool 3",
      //   strategy: "C.V",
      //   proposals: 3,
      //   href: "3",
      // },
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
        proposals: 3,
        href: `${contractsAddresses.poolID}`,
      },
    ],
  },
];
