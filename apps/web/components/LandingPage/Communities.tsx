"use client";
import { motion } from "motion/react";
import Image from "next/image";
import { XCircleIcon } from "@heroicons/react/24/outline";
import { Statistic } from "../Statistic";
import { newLogo } from "../../assets";
import { Button } from "../Button";
import { Title } from "./Titles";

const communities = [
  {
    name: "1Hive",
    description: "A community for gardening enthusiasts.",
    members: 22,
    link: "https://app.gardens.fund/gardens/100/0x71850b7e9ee3f13ab46d67167341e4bdc905eef9/0xe2396fe2169ca026962971d3b2e373ba925b6257",
    socials: {
      twitter: "https://twitter.com/gardenersunited",
      facebook: "https://facebook.com/gardenersunited",
    },
  },
  {
    name: "Gitcoin Grants Gardens",
    description: "A community for gardening enthusiasts.",
    members: 27,
    link: "https://app.gardens.fund/gardens/10/0x1eba7a6a72c894026cd654ac5cdcf83a46445b08/0xd3345828914b740fddd1b8ae4f4d2ce03d1e0960",
    socials: {
      twitter: "https://twitter.com/gardenersunited",
      facebook: "https://facebook.com/gardenersunited",
    },
  },
  {
    name: "Blockscout",
    description:
      "A community for gardening enthusiasts gardening enthusiasts gardening enthusiasts.",
    members: 380,
    link: "https://app.gardens.fund/gardens/100/0xe91d153e0b41518a2ce8dd3d7944fa863463a97d/0xa9257a428dc6b192bd1ccc14c0a5a61476c767b9",
    socials: {
      twitter: "https://twitter.com/gardenersunited",
      facebook: "https://facebook.com/gardenersunited",
    },
  },
  {
    name: "Mars Garden",
    description:
      "A community for gardening enthusiasts gardening enthusiasts gardening enthusiasts.",
    members: 13,
    link: "https://app.gardens.fund/gardens/42161/0xf1588798b3b8de0f297b87a1196dd4c57a0194ab/0x98d84697794f4aae7540c1f85433e2ab39ab1206",
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

export const Communities = () => {
  return (
    <motion.section
      className="mx-auto md:mx-16 bg-primary-soft py-4 px-2 lg:px-24 lg:py-14 rounded-3xl"
      initial={{ opacity: 0.5 }}
      whileInView={{ opacity: 1 }}
      transition={{ ease: "easeInOut", duration: 0.45 }}
    >
      <Title
        heading="Communities"
        subHeading="Join a community today!"
        inverted
      />

      <div className="flex flex-col gap-8">
        {communities.map((community) => (
          <CommunityCard key={community.name} {...community} />
        ))}
      </div>
    </motion.section>
  );
};

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
      className="flex w-full origin-top gap-7 rounded-xl bg-neutral p-4 backdrop-blur-md backdrop-filter max-md:flex-col md:py-6"
    >
      <Image
        alt="communityLogo"
        loading="lazy"
        width="150"
        height="112"
        decoding="async"
        data-nimg="1"
        className="w-full rounded-xl md:h-20 md:w-20"
        src={newLogo}
      />{" "}
      <div className="flex flex-1 justify-between gap-10 max-md:flex-col md:items-center">
        <div className="flex flex-col gap-2 md:w-[45%]">
          <h3 className="text-xl">{name}</h3>
          <p className="max-w-md text-caption">{description}</p>
        </div>
        <div className="grid grid-cols-1 gap-10 max-lg:flex-col max-lg:gap-3 md:w-[20%] lg:w-[30%] lg:grid-cols-2">
          <div className="flex flex-col gap-4 max-lg:gap-1">
            <span className="text-caption1">Active Members:</span>
            <span className="whitespace-pre text-xl">{members}</span>
          </div>
          <div className="flex flex-col gap-4 max-lg:gap-1">
            <span className="text-caption1">Socials:</span>
            <span className="whitespace-pre text-xl">X Y Z</span>
          </div>
        </div>
        <div className="flex justify-end md:w-[20%] lg:w-[20%]">
          <a
            target="_blank"
            className="inline-flex items-center gap-2.5 justify-center whitespace-nowrap rounded-full font-medium ring-offset-background transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-primary-foreground h-11 px-3 text-xs max-md:w-full"
            href={link}
          >
            <Button btnStyle="outline">
              <span className="sr-only">Join</span>
              Join
            </Button>
          </a>
        </div>
      </div>
    </motion.div>
  );
};

//
