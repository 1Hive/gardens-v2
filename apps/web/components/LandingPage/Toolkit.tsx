"use client";
import React, { useRef } from "react";
import { ReactNode } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Title } from "./Titles";

export const ToolkitFeatures = () => {
  return (
    <section className="mx-auto max-w-7xl px-4 text-neutral-content">
      <Title
        inverted
        heading="Grow faster with our"
        subHeading="curated governance toolkit"
      />
      <div className="mb-4 grid grid-cols-12 gap-4">
        <BounceCard className="col-span-12 md:col-span-4">
          <CardTitle>Gnosis Safe</CardTitle>
          <div className="absolute bottom-0 left-4 right-4 top-32 translate-y-8 rounded-t-2xl bg-gradient-to-br from-[#2AAAE5] to-[#E5F7FA] p-4 transition-transform duration-[250ms] group-hover:translate-y-4 group-hover:rotate-[2deg]">
            <p className="block text-center">
              Infinitely composable multisigs integrated into Gardens community
              management and proposal dispute resolution.
            </p>
          </div>
        </BounceCard>

        <BounceCard className="col-span-12 md:col-span-8">
          <CardTitle>Allo Protocol</CardTitle>
          <div className="absolute bottom-0 left-4 right-4 top-32 translate-y-8 rounded-t-2xl bg-gradient-to-br from-[#FF9500] to-[#FFF4E6] p-4 transition-transform duration-[250ms] group-hover:translate-y-4 group-hover:rotate-[2deg]">
            <p className="block text-center">
              Born from Gitcoin’s Grants Stack, a smart contract framework
              enabling novel funding mechanisms securely linked to funding
              pools.
            </p>
          </div>
        </BounceCard>
      </div>
      <div className="grid grid-cols-12 gap-4">
        <BounceCard className="col-span-12 md:col-span-8">
          <CardTitle>Conviction voting</CardTitle>
          <div className="absolute bottom-0 left-4 right-4 top-32 translate-y-8 rounded-t-2xl bg-gradient-to-br from-[#49A612] to-[#EBFBD8] p-4 transition-transform duration-[250ms] group-hover:translate-y-4 group-hover:rotate-[2deg]">
            <p className="block text-center">
              A continuous voting system where your support gains strength over
              time. Encourages ongoing participation, favors consistent
              long-term members and ideas, and protects communities from
              short-term manipulation.
            </p>
          </div>
        </BounceCard>

        <BounceCard className="col-span-12 md:col-span-4">
          <CardTitle>Gitcoin Passport</CardTitle>
          <div className="absolute bottom-0 left-4 right-4 top-32 translate-y-8 rounded-t-2xl bg-gradient-to-br from-[#EB4848] to-[#FFE6E6] p-4 transition-transform duration-[250ms] group-hover:translate-y-4 group-hover:rotate-[2deg]">
            <p className="block text-center">
              Web3’s leading tool for sybil resistance, enabling custom voting
              weight systems that help improve collective decision making.
            </p>
          </div>
        </BounceCard>
      </div>
    </section>
  );
};

const BounceCard = ({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) => {
  return (
    <motion.div
      whileHover={{ scale: 0.95, rotate: "-1deg" }}
      className={`group relative min-h-[300px] cursor-pointer overflow-hidden rounded-2xl bg-slate-100 p-8 ${className}`}
    >
      {children}
    </motion.div>
  );
};

const CardTitle = ({ children }: { children: ReactNode }) => {
  return (
    <h3 className="mx-auto text-center text-3xl font-semibold text-neutral-content">
      {children}
    </h3>
  );
};
