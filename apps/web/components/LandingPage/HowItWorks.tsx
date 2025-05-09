"use client";

import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { newLogo, grassLarge } from "@/assets";
import { useScroll, useTransform, motion } from "motion/react";
import { Title } from "./Titles";

export function HowItWorks() {
  const data = [
    {
      title: "Create or Join a Community",
      content: (
        <div>
          <h5 className="font-bold mb-8">
            Start by joining a community you like or create a new with your own
            values and covenant.
          </h5>
          <div className="grid grid-cols-2 gap-4">
            <Card
              title="Covenant"
              description="The Covenant is a foundational agreement that governs the operations and decision-making processes within a Community. It outlines the rules and responsibilities of participants. "
            />
            <Card
              title="Community & Protocol Fee"
              description="Community Fees are optionally set by the Council Safe. 
Protocol Fees (is a % of the community fee) go to the Gardens platform and are also paid by users when joining a community."
            />
          </div>
        </div>
      ),
    },
    {
      title: "Pools",
      content: (
        <div>
          <h5 className="font-bold mb-8">
            Different Pools that can be set up in a community to meet specific
            applications.
          </h5>

          <div className="grid grid-cols-2 gap-4">
            <Card
              title="Funding Pools"
              description="Funding Pools are linked to a pool of tokens, which can be
            requested. An execution threshold is based on the requested amount relative to the total funds available in the  pool."
            />
            <Card
              title="Signaling Pools"
              description="Signaling Pools do not link to any executable onchain actions, they
            simply accumulate conviction to make decisions."
            />
          </div>
        </div>
      ),
    },
    {
      title: "Proposals",
      content: (
        <div>
          <h5 className="mb-4 font-bold">
            Pitch Your Ideas and Gather Community Support!.
          </h5>

          <div className="grid grid-cols-2 gap-4">
            <Card
              title="Funding Proposals"
              description="Funding  proposals are designed to request financial support from the Community Pool for specific community projects or initiatives. "
            />
            <Card
              title="Siganling Proposals"
              description="Signaling proposals are used to gauge community sentiment regarding changes or initiatives without requesting financial resources."
            />
          </div>
        </div>
      ),
    },
    {
      title: "Tribunal and Council safe",
      content: (
        <div>
          <h5 className="font-bold mb-4">
            Tribunal and Council Safe are the two main governance bodies of a
            community.
          </h5>
          <div className="grid grid-cols-2 gap-4">
            <Card
              title="Council Safe"
              description="Safe is to manage the settings of Pools
            and the community as a whole."
            />
            <Card
              title="Tribunal Safe"
              description="Serves as a dispute resolution body within a Community.
            Members can dispute proposals and the Tribunal will adjudicate
            based on established guidelines and covenant"
            />
          </div>
        </div>
      ),
    },
  ];
  return (
    <div className="w-full ">
      <Timeline data={data} />
    </div>
  );
}

interface TimelineEntry {
  title: string;
  content: React.ReactNode;
}

const Card = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => {
  return (
    <>
      <div className="relative rounded-2xl p-4 h-[323px] flex flex-col gap-6 bg-primary-soft overflow-hidden">
        <h4>{title}</h4>
        <p>{description}</p>

        <Image
          src={grassLarge}
          alt="Garden Land"
          className="absolute bottom-0 inset-x-0 w-full object-cover h-6"
        />
      </div>
    </>
  );
};

export const Timeline = ({ data }: { data: TimelineEntry[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);
    }
  }, [ref]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 1%", "end 50%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div className="w-full font-sans md:px-10" ref={containerRef}>
      <Title heading="How it works" subHeading="A step by step guide" />

      <div ref={ref} className="relative max-w-7xl mx-auto pb-10">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex justify-start pt-10 md:pt-20 md:gap-10 "
          >
            <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full ">
              <div className="h-10 absolute left-3 md:left-3 w-10 rounded-full bg-primary-content   flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-neutral-200border border-neutral-300  p-2 " />
              </div>
              <h3 className="hidden md:block text-xl md:pl-20 md:text-4xl font-bold text-neutral-500 ">
                {item.title}
              </h3>
            </div>

            <div className="relative pl-20 pr-4 md:pl-4 w-full">
              <h3 className="md:hidden block text-2xl mb-4 text-left font-bold text-neutral-500">
                {item.title}
              </h3>
              {item.content}{" "}
            </div>
          </div>
        ))}
        <div
          style={{
            height: height + "px",
          }}
          className="absolute md:left-8 left-8 top-0 overflow-hidden w-[2px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-neutral-200 [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)] "
        >
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute inset-x-0 top-0  w-[2px] bg-gradient-to-t from-[#2AAAE5] via-[#49A612] to-transparent from-[0%] via-[10%] rounded-full"
          />
        </div>
      </div>
    </div>
  );
};
