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

  const AnimatedSvg = () => {
    useEffect(() => {
      // Select all paths in the SVG
      const paths = document.querySelectorAll("path");

      // Animate each path sequentially
      paths.forEach((path, index) => {
        // Get the length of the path
        const length = path.getTotalLength();

        // Set initial styles
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
        path.style.fillOpacity = "0";
        path.style.stroke = path.getAttribute("fill") || "#000";
        path.style.strokeWidth = "1";

        // Create animation with delay based on index
        setTimeout(() => {
          // Draw the outline
          path.style.transition = `stroke-dashoffset 1.2s ease-in-out, fill-opacity 0.8s ease-in-out ${index * 0.1 + 0.4}s`;
          path.style.strokeDashoffset = "0";

          // Fill in the color after the outline is drawn
          setTimeout(() => {
            path.style.fillOpacity = "1";
          }, 400);
        }, index * 100);
      });
    }, []);

    return (
      <div className="mx-auto flex max-w-7xl items-center justify-center p-2 lg:px-8">
        <svg
          width="115"
          height="105"
          viewBox="0 0 115 105"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M91.625 78.6107C86.6978 89.2337 87.0338 99.8567 92.297 102.317C97.5602 104.777 105.959 98.0675 110.886 87.4445C115.813 76.8215 115.478 66.1985 110.214 63.7385C104.839 61.2784 96.5523 67.9877 91.625 78.6107Z"
            fill="#65AD18"
          />
          <path
            d="M89.3852 41.821H83.5621V105H89.3852V41.821Z"
            fill="#65AD18"
          />
          <path
            d="M110.786 24.6727C110.911 19.4249 106.752 15.0694 101.497 14.9445C96.2416 14.8196 91.8799 18.9725 91.7547 24.2202C91.6296 29.468 95.7885 33.8234 101.044 33.9484C106.299 34.0733 110.661 29.9204 110.786 24.6727Z"
            fill="#279DC1"
          />
          <path
            d="M86.25 29.4087C80.9868 29.4087 76.7314 33.6579 76.7314 38.9135C76.7314 44.1691 80.9868 48.4183 86.25 48.4183C91.5132 48.4183 95.7686 44.1691 95.7686 38.9135C95.7686 33.7697 91.5132 29.4087 86.25 29.4087Z"
            fill="#279DC1"
          />
          <path
            d="M81.2106 24.0414C81.2106 18.7858 76.9552 14.5366 71.692 14.5366C66.4288 14.5366 62.1735 18.7858 62.1735 24.0414C62.1735 29.297 66.4288 33.5462 71.692 33.5462C76.9552 33.5462 81.2106 29.297 81.2106 24.0414Z"
            fill="#279DC1"
          />
          <path
            d="M86.6978 19.0096C91.961 19.0096 96.2163 14.7604 96.2163 9.50479C96.2163 4.2492 91.961 0 86.6978 0C81.4346 0 77.1792 4.2492 77.1792 9.50479C77.1792 14.7604 81.3226 19.0096 86.6978 19.0096Z"
            fill="#279DC1"
          />
          <path
            d="M86.474 33.7701C91.7373 33.7701 95.9926 29.5209 95.9926 24.2653C95.9926 19.0097 91.7373 14.7605 86.474 14.7605C81.2108 14.7605 76.9555 19.0097 76.9555 24.2653C76.8435 29.5209 81.2108 33.7701 86.474 33.7701Z"
            fill="#FFE236"
          />
          <path
            d="M22.7559 78.6104C27.6831 89.2334 27.3472 99.8564 22.084 102.317C16.8208 104.777 8.42209 98.0673 3.49483 87.4443C-1.43243 76.8213 -1.09651 66.1983 4.1667 63.7382C9.42991 61.2782 17.8286 67.9874 22.7559 78.6104Z"
            fill="#65AD18"
          />
          <path
            d="M31.939 78.6104C27.0118 89.2334 27.3477 99.8564 32.611 102.317C37.8742 104.777 46.2729 98.0673 51.2001 87.4443C56.1274 76.8213 55.7915 66.1983 50.5283 63.7382C45.1531 61.2782 36.8663 67.9874 31.939 78.6104Z"
            fill="#65AD18"
          />
          <path
            d="M30.2592 49.4248H24.436V105H30.2592V49.4248Z"
            fill="#65AD18"
          />
          <path
            d="M46.2724 23.035C46.2724 22.9232 46.2724 22.8113 46.2724 22.6995C46.2724 18.7858 43.2489 15.6548 39.5535 15.6548C35.858 15.6548 32.8345 18.7858 32.8345 22.6995C32.8345 18.7858 29.8109 15.6548 26.1155 15.6548C22.42 15.6548 19.3965 18.7858 19.3965 22.6995C19.3965 18.7858 16.3729 15.6548 12.6775 15.6548C8.98204 15.6548 5.9585 18.7858 5.9585 22.6995C5.9585 22.8113 5.9585 22.9232 5.9585 23.035C6.29445 42.0446 15.1411 57.3641 26.1155 57.3641C37.2018 57.3641 46.0485 42.0446 46.2724 23.035Z"
            fill="#FFE236"
          />
        </svg>
        {/* <div className="right-5 border2 bg-neutral-soft-2 rounded-3xl py-2 px-6 h-fit hover:text-primary-content hover:bg-neutral-soft-3 transition-all duration-300 ease-in-out">
          <a
            href="https://x.com/1HiveOrg"
            target="_blank"
            className="text-center"
          >
            Powered by 1Hive
          </a>
        </div> */}
      </div>
    );
  };

  return (
    <div className="bg-primary-soft relative min-h-screen overflow-hidden">
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
              delay: 0.5,
              duration: 0.3,
              scale: { type: "spring", visualDuration: 0.3, bounce: 0.35 },
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

      <div className="relative isolate overflow-hidden py-20">
        <div aria-hidden="true" className="" />
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8 ">
          <motion.div
            className="max-w-2xl  bg-neutral-soft-2 rounded-3xl p-8 pr-16 border2"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.3,
              scale: { type: "spring", visualDuration: 0.3, bounce: 0.5 },
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
      <AnimatedSvg />
      <div className="right-5 absolute bottom-5 border2 bg-neutral-soft-2 rounded-3xl py-2 px-6 h-fit hover:text-primary-content hover:bg-neutral-soft-3 transition-all duration-300 ease-in-out">
        <a
          href="https://x.com/1HiveOrg"
          target="_blank"
          className="text-center"
        >
          Powered by 1Hive
        </a>
      </div>

      {/* <Image
        src={PoweredBy}
        width={100}
        height={100}
        alt={"poweredBy img"}
        className="absolute bottom-5 right-5"
      /> */}
    </div>
  );
};

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i: number) => {
    const delay = i * 0.3;
    return {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { delay, type: "spring", duration: 1.5, bounce: 0 },
        opacity: { delay, duration: 0.01 },
      },
    };
  },
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
  duration = 1300,
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
          opacity: 0.5,
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
