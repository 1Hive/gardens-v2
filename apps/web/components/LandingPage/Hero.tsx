import React, { useCallback, useEffect } from "react";

import { newLogo, PoweredBy } from "@/assets";
import { useState } from "react";
import Image from "next/image";
import {
  Bars3Icon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { Dialog } from "@headlessui/react";
import { Button } from "@/components/Button";
import { commF } from "@/assets";
import cn from "classnames";
import { AnimatePresence, motion } from "motion/react";

export const Hero = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <div className="bg-primary-soft relative min-h-screen">
      <header className="absolute inset-x-0 top-0 z-50">
        {/* <Banner /> */}

        <nav
          aria-label="Global"
          className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8"
        >
          <motion.div
            className="flex lg:flex-1"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.2,
              scale: { type: "spring", visualDuration: 0.2, bounce: 0.5 },
            }}
          >
            <span className="sr-only">Gardens logo</span>
            <div className="-m-1.5 flex items-center gap-3 p-1.5">
              <Image
                src={newLogo}
                alt="logo"
                height={40}
                width={40}
                loading="lazy"
              />
              <span className="text-2xl font-medium">Gardens</span>
            </div>
          </motion.div>
          <div className="flex lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5"
            >
              <span className="sr-only">Open main menu</span>
              <Bars3Icon aria-hidden="true" className="h-6 w-6" />
            </button>
          </div>
        </nav>
        <Dialog
          open={mobileMenuOpen}
          onClose={setMobileMenuOpen}
          className="lg:hidden"
        >
          <div className="fixed inset-0 z-50" />
          <Dialog.Panel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-between">
              <div className="-m-1.5 p-1.5">
                <span className="sr-only">Gardens</span>
                <Image
                  src={newLogo}
                  alt="logo"
                  height={40}
                  width={40}
                  loading="lazy"
                />
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
              >
                <span className="sr-only">Close menu</span>
                <XMarkIcon aria-hidden="true" className="h-6 w-6" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div className="space-y-2 py-6">
                  {/* {navigation.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                    >
                      {item.name}
                    </a>
                  ))} */}
                </div>
              </div>
            </div>
          </Dialog.Panel>
        </Dialog>
      </header>

      <div className="relative isolate overflow-hidden pt-20">
        <div aria-hidden="true" className="" />
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8 ">
          <motion.div
            className="max-w-2xl  bg-neutral-soft-2 rounded-3xl p-8 pr-16 border2"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: 0.2,
              duration: 0.2,
              scale: { type: "spring", visualDuration: 0.2, bounce: 0.7 },
            }}
          >
            <h1 className="tracking-tigh max-w-2xl text-3xl font-bold opacity-90 sm:text-5xl uppercase">
              Planting the seeds for the public economy
            </h1>
            <div className="mt-2 max-w-xl xl:col-end-1 xl:row-start-1">
              <p className="text-md leading-2">
                Gardens is a coordination platform giving communities
                streamlined access to conviction voting and web3’s best
                decision-sourcing mechanisms.
              </p>
              <FlipWordsDemo />
              <div className="mt-2 flex flex-col md:flex-row  items-center gap-6">
                <a
                  href="https://app.gardens.fund/"
                  className="flex items-center justify-center text-sm font-semibold leading-6 text-gray-900"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button>Launch App</Button>
                </a>
                <a
                  href="https://docs.gardens.fund"
                  className="flex items-center justify-center text-sm font-semibold leading-6 text-gray-900"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button btnStyle="outline">Documentation</Button>
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <Image
        src={PoweredBy}
        width={125}
        height={125}
        alt={"poweredBy img"}
        className="absolute bottom-5 right-5"
      />
    </div>
  );
};

function FlipWordsDemo() {
  const words = ["healthy", "fun", "intuitive", "secure", "open"];

  return (
    <p className="text-md leading-2 mt-2">
      Our emphasis is on a community experience that’s
      <FlipWords words={words} />
    </p>
  );
}

const FlipWords = ({
  words,
  duration = 1000,
  className,
}: {
  words: string[];
  duration?: number;
  className?: string;
}) => {
  const [currentWord, setCurrentWord] = useState(words[0]);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // thanks for the fix Julian - https://github.com/Julian-AT
  const startAnimation = useCallback(() => {
    const word = words[words.indexOf(currentWord) + 1] || words[0];
    setCurrentWord(word);
    setIsAnimating(true);
  }, [currentWord, words]);

  useEffect(() => {
    if (!isAnimating)
      setTimeout(() => {
        startAnimation();
      }, duration);
  }, [isAnimating, duration, startAnimation]);

  return (
    <AnimatePresence
      onExitComplete={() => {
        setIsAnimating(false);
      }}
    >
      <motion.div
        initial={{
          opacity: 0,
          y: 10,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 10,
        }}
        exit={{
          opacity: 0,
          y: -40,
          x: 40,
          filter: "blur(8px)",
          scale: 2,
          position: "absolute",
        }}
        className={cn("z-10 inline-block relative text-left px-2", className)}
        key={currentWord}
      >
        {currentWord.split(" ").map((word, wordIndex) => (
          <motion.span
            key={word + wordIndex}
            initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              delay: wordIndex * 0.3,
              duration: 0.3,
            }}
            className="inline-block text-primary-content"
          >
            {word.split("").map((letter, letterIndex) => (
              <motion.span
                key={word + letterIndex}
                initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  delay: wordIndex * 0.3 + letterIndex * 0.05,
                  duration: 0.2,
                }}
                className="inline-block font-semibold text-2xl"
              >
                {letter}
              </motion.span>
            ))}
          </motion.span>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

//Dropdown Menu:
