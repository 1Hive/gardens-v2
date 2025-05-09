"use client";

import { motion } from "motion/react";
import { newLogo } from "@/assets";
import { ChainIcon } from "@/configs/chains";
import Image from "next/image";

export const Networks = () => {
  return (
    <Container
      eyebrow="Source"
      title="Get the furthest reach"
      description="Bypass those inconvenient privacy laws to source leads from the most unexpected places."
      graphic={<LogoCluster />}
      className="lg:col-span-2"
    />
  );
};
function Container({
  dark = false,
  className = "",
  eyebrow,
  title,
  description,
  graphic,
  fade = [],
}: {
  dark?: boolean;
  className?: string;
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  graphic: React.ReactNode;
  fade?: ("top" | "bottom")[];
}) {
  return (
    <motion.div
      initial="idle"
      whileHover="active"
      variants={{ idle: {}, active: {} }}
      data-dark={dark ? "true" : undefined}
      className="group relative flex flex-col overflow-hidden rounded-lg 
        bg-primary  my-20"
    >
      <div className="relative h-80 shrink-0">
        {graphic}
        {fade.includes("top") && (
          <div className="absolute inset-0 bg-linear-to-b from-white to-50% group-data-dark:from-gray-800 group-data-dark:from-[-25%]" />
        )}
        {fade.includes("bottom") && (
          <div className="absolute inset-0 bg-linear-to-t from-white to-50% group-data-dark:from-gray-800 group-data-dark:from-[-25%]" />
        )}
      </div>
      <h4 className="text-center mt-4 text-2xl font-chakra">
        GNOSIS - ARBITRUM - OPTIMISM - POLYGON - BASE - CELO
      </h4>
    </motion.div>
  );
}

function Circle({
  size,
  delay,
  opacity,
}: {
  size: number;
  delay: number;
  opacity: string;
}) {
  return (
    <motion.div
      variants={{
        idle: { width: `${size}px`, height: `${size}px` },
        active: {
          width: [`${size}px`, `${size + 10}px`, `${size}px`],
          height: [`${size}px`, `${size + 10}px`, `${size}px`],
          transition: {
            duration: 0.75,
            repeat: Infinity,
            repeatDelay: 1.25,
            ease: "easeInOut",
            delay,
          },
        },
      }}
      style={{ "--opacity": opacity } as React.CSSProperties}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-primary-content/[25%] ring-inset"
    />
  );
}

function Circles() {
  return (
    <div className="absolute inset-0">
      <Circle size={528} opacity="3%" delay={0.45} />
      <Circle size={400} opacity="5%" delay={0.3} />
      <Circle size={272} opacity="5%" delay={0.15} />
      <Circle size={144} opacity="10%" delay={0} />
      <div className="absolute inset-0 bg-linear-to-t from-[#65AD18] to-65%" />
    </div>
  );
}

function MainLogo() {
  return (
    <div className="absolute top-32 left-44 flex size-16 items-center justify-center rounded-full bg-primary ">
      <Image src={newLogo} alt="logo" height={64} width={64} loading="lazy" />
    </div>
  );
}

function Logo({
  chain,
  left,
  top,
  hover,
}: {
  chain: number;
  left: number;
  top: number;
  hover: { x: number; y: number; rotate: number; delay: number };
}) {
  return (
    <motion.div
      variants={{
        idle: { x: 0, y: 0, rotate: 0 },
        active: {
          x: [0, hover.x, 0],
          y: [0, hover.y, 0],
          rotate: [0, hover.rotate, 0],
          transition: {
            duration: 0.75,
            repeat: Infinity,
            repeatDelay: 1.25,
            ease: "easeInOut",
            delay: hover.delay,
          },
        },
      }}
      style={{ left, top } as React.CSSProperties}
      className="absolute size-16 rounded-full shadow-sm"
    >
      <ChainIcon chain={chain} height={64} />
    </motion.div>
  );
}

function LogoCluster() {
  return (
    <div aria-hidden="true" className="relative h-full overflow-hidden">
      <Circles />
      <div className="absolute left-1/2 h-full w-[26rem] -translate-x-1/2">
        <MainLogo />
        <Logo
          chain={100}
          left={360}
          top={144}
          hover={{ x: 6, y: 1, rotate: 5, delay: 0.38 }}
        />
        <Logo
          chain={10}
          left={285}
          top={20}
          hover={{ x: 4, y: -5, rotate: 6, delay: 0.3 }}
        />
        <Logo
          chain={42161}
          left={255}
          top={210}
          hover={{ x: 3, y: 5, rotate: 7, delay: 0.2 }}
        />
        <Logo
          chain={137}
          left={144}
          top={40}
          hover={{ x: -2, y: -5, rotate: -6, delay: 0.15 }}
        />
        <Logo
          chain={8453}
          left={36}
          top={56}
          hover={{ x: -4, y: -5, rotate: -6, delay: 0.35 }}
        />
        {/* here goes the Celo chain logo */}
        {/* <Logo
          chain={8453}
          left={96}
          top={176}
          hover={{ x: -3, y: 5, rotate: 3, delay: 0.15 }}
        /> */}
      </div>
    </div>
  );
}
