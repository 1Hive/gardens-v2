"use client";
import { motion } from "motion/react";
import { XCircleIcon } from "@heroicons/react/24/outline";
import { Statistic } from "../Statistic";

const communities = [
  {
    name: "Gardeners United",
    description: "A community for gardening enthusiasts.",
    members: 100,
    link: "https://gardenersunited.com",
    socials: {
      twitter: "https://twitter.com/gardenersunited",
      facebook: "https://facebook.com/gardenersunited",
    },
  },
  {
    name: "Gardeners United",
    description: "A community for gardening enthusiasts.",
    members: 370,
    link: "https://gardenersunited.com",
    socials: {
      twitter: "https://twitter.com/gardenersunited",
      facebook: "https://facebook.com/gardenersunited",
    },
  },
  {
    name: "Blockscout",
    description:
      "A community for gardening enthusiasts gardening enthusiasts gardening enthusiasts.",
    members: 1120,
    link: "https://gardenersunited.com",
    socials: {
      twitter: "https://twitter.com/gardenersunited",
      facebook: "https://facebook.com/gardenersunited",
    },
  },
];

interface CommunityCardProps {
  name: string;
  description: string;
  members: number;
  link: string;
  socials: {
    twitter: string;
    facebook: string;
  };
  // img?: string;
}

const CommunityCard = ({
  name,
  description,
  members,
  link,
  socials,
  // img,
}: CommunityCardProps) => {
  return (
    <motion.div
      initial={{ y: 48, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      transition={{ ease: "easeInOut", duration: 0.75 }}
      className="mb-4 flex items-center gap-8 border2 px-3 py-6 border1 group relative rounded-2xl bg-neutral border2 "
    >
      {/* img */}
      <div className="border2 h-20 w-[200px]"></div>
      {/* name & description */}
      <div className="flex flex-col gap-1.5">
        <h3 className="uppercase">{name}</h3>
        <p className="text-sm max-w-xs">{description}</p>
      </div>

      {/* members */}
      <div>
        <Statistic count={members} label="members" />
      </div>
      <div className="flex items-center gap-1.5 text-end text-sm uppercase text-zinc-500">
        <p>{link}</p>
        <XCircleIcon />
      </div>
    </motion.div>
  );
};

export const Communities = () => {
  return (
    <section id="launch-schedule" className="mx-auto px-24 py-16">
      <motion.h1
        initial={{ y: 48, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ ease: "easeInOut", duration: 0.75 }}
        className="mb-16 font-black text-center"
      >
        Join our top communities
      </motion.h1>

      <div className="">
        {communities.map((community) => (
          <CommunityCard {...community} />
        ))}
      </div>
    </section>
  );
};

const ComunitiesCard = ({
  name,
  description,
  members,
  link,
  socials,
}: CommunityCardProps) => {
  return (
    <motion.div
      initial={{ y: 48, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      transition={{ ease: "easeInOut", duration: 0.75 }}
      className="mb-9 flex flex-col items-center justify-between border-b border-zinc-800 px-3 pb-9"
    >
      <div>
        <p className="mb-1.5 text-xl text-zinc-50">{name}</p>
        <p className="text-sm uppercase text-zinc-500">{description}</p>
      </div>
      <div className="flex items-center gap-1.5 text-end text-sm uppercase text-zinc-500">
        <p>{link}</p>
        <XCircleIcon />
      </div>
    </motion.div>
  );
};
