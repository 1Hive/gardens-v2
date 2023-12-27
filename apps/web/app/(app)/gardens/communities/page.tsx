import { honeyIcon } from "@/assets";
import Image from "next/image";
import { gardenLand } from "@/assets";
import Link from "next/link";

export default function Gardens() {
  return (
    <>
      <div className="container relative mx-auto max-w-5xl space-y-10 rounded-xl border-[3px] border-black bg-base-100 px-2 py-4">
        {/* header: honey logo +stats */}
        <header className="flex items-center justify-between gap-4  py-6">
          <div className="flex w-44 items-center justify-center gap-2">
            <Image src={honeyIcon} alt="honey icon" className="h-20 w-20" />
            <span className="text-2xl font-bold">HNY</span>
          </div>
          <div className="flex flex-1">
            {stats.map((stat) => (
              <div className="flex w-full flex-col items-center justify-center gap-2">
                <span className="text-3xl font-semibold text-info">
                  {stat.label}
                </span>
                <span className="text-xl font-bold">{stat.value}</span>
              </div>
            ))}
          </div>
        </header>

        <div className="mx-auto max-w-3xl space-y-4 ">
          {/* communites */}
          {conmmunities.map((community) => (
            <CommunityCard {...community} />
          ))}
        </div>
      </div>
    </>
  );
}

const CommunityCard = ({ name, address, href, pools }: any) => {
  return (
    <>
      <>
        <div
          className="relative z-50 flex items-center justify-between overflow-hidden rounded-xl border-2 border-black bg-info px-8 py-4 transition-all duration-200 ease-in-out hover:scale-105 hover:border-secondary"
          // href={`/gardens/communities/${href}`}
        >
          <div className="flex flex-col space-y-4">
            <span className="text-md line-clamp-3 w-44 font-press leading-6 text-info-content">
              {name}
            </span>
            <span className="font-press text-xs">{address}</span>
          </div>

          {/* pools */}
          <div className="mx-auto flex h-[170px] w-full snap-x  space-x-4 overflow-x-auto transition-all duration-150 ease-in">
            {pools?.map((pool: any) => <PoolCard {...pool} />)}
          </div>
        </div>
      </>
    </>
  );
};

const PoolCard = ({ name, strategy, proposals, href }: any) => {
  return (
    <>
      <Link
        className="min-w-56 relative flex h-full w-56 shrink-0 snap-center flex-col items-start rounded-md border-2 border-black transition-all duration-150 ease-in-out  hover:border-primary"
        href={`/gardens/communities/pool/${href}`}
      >
        <span className="w-full py-3 text-center font-press">{name}</span>
        <div className="text-s flex w-full px-2">
          <div className="mt-3 flex w-full flex-col gap-2">
            <span className="flex justify-between text-xs">
              <span className="font-press">strategy</span>
              <span className="font-press">{strategy}</span>
            </span>
            <span className="flex justify-between text-xs">
              <span className="font-press">proposals</span>
              <span className="font-press">{proposals}</span>
            </span>
          </div>
        </div>

        <Image
          src={gardenLand}
          alt="honey icon"
          className="absolute bottom-0 left-0 right-0 h-10 w-full object-cover"
        />
      </Link>
    </>
  );
};
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
const conmmunities = [
  {
    name: "1Hive",
    address: "0x...",
    href: "1hive",
    pools: [
      {
        name: "Pool 1",
        strategy: "c.v",
        proposals: 3,
        href: "1",
      },
      {
        name: "Pool 2",
        strategy: "c.v",
        proposals: 6,
        href: "2",
      },
      {
        name: "Pool 3",
        strategy: "c.v",
        proposals: 2,
        href: "3",
      },
    ],
  },
  {
    name: "1hive Memecoins",
    address: "0x...",
    href: "#",
    pools: [
      {
        name: "Pool 1",
        strategy: "c.v",
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
        strategy: "c.v",
        proposals: 2,
      },
      {
        name: "Pool 2",
        strategy: "quest",
        proposals: 3,
      },
      {
        name: "Pool 3",
        strategy: "c.v",
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
        strategy: "c.v",
        proposals: 8,
      },
    ],
  },
];
