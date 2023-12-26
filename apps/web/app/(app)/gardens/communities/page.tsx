import { honeyIcon } from "@/assets";
import Image from "next/image";
import { gardenFlower } from "@/assets";
import Link from "next/link";

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
  },
  {
    name: "1hive Memecoins",
    address: "0x...",
    href: "#",
  },
  {
    name: "1hive Foundation DAO",
    address: "0x...",
    href: "#",
  },
  {
    name: "1hive Gardens Swarm",
    address: "0x...",
    href: "#",
  },
];

export default function Gardens() {
  return (
    <>
      <div className="container mx-auto max-w-5xl space-y-10 rounded-xl border-[3px] border-black bg-base-100 px-2 py-4">
        {/* header: honey logo +stats */}
        <header className="flex items-center justify-between gap-4  py-6">
          <div className="flex  w-44 justify-center">
            <Image src={honeyIcon} alt="honey icon" className="h-20 w-20" />
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

const CommunityCard = ({ name, address, href }: any) => {
  return (
    <>
      {/* {communites.map((community: any) => ( */}
      <>
        <Link
          className="flex items-start justify-between rounded-xl border-2 border-black bg-info px-8 py-4 transition-all duration-200 ease-in-out hover:scale-105 hover:border-secondary"
          href={`/gardens/communities/${href}`}
        >
          <div className="flex flex-col space-y-4">
            <span className="text-md font-press text-info-content">{name}</span>
            <span className="font-press text-xs">{address}</span>
          </div>
          <Image src={gardenFlower} alt="honey icon" />
        </Link>
      </>
      {/* ))} */}
    </>
  );
};
