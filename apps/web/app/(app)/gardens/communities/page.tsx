import { honeyIcon, gardenLand } from "@/assets";
import Image from "next/image";
import { CommunityCard } from "@/components";

export default function Garden() {
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
      {
        name: "Pool 4",
        strategy: "c.v",
        proposals: 3,
        href: "4",
      },
      {
        name: "Pool 5",
        strategy: "c.v",
        proposals: 6,
        href: "5",
      },
      {
        name: "Pool 6",
        strategy: "c.v",
        proposals: 2,
        href: "6",
      },
      {
        name: "Pool 7",
        strategy: "c.v",
        proposals: 3,
        href: "7",
      },
      {
        name: "Pool 8",
        strategy: "c.v",
        proposals: 6,
        href: "8",
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
