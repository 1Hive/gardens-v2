import { motion } from "motion/react";
import { Button } from "../Button";

export const CultivateChange = () => {
  return (
    <motion.div
      className="mx-auto max-w-7xl sm:px-6 lg:px-8"
      initial={{ opacity: 0, scale: 0.25 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.4,
        scale: { type: "spring", visualDuration: 0.75, bounce: 0.35 },
      }}
    >
      <div className="isolate overflow-hidden px-6 py-16 sm:rounded-3xl sm:px-24 xl:py-24 relative bg-primary-soft">
        <h2 className="mx-auto max-w-2xl text-center font-bold tracking-tight sm:text-4xl font-chakra">
          Cultivate change with Gardens
        </h2>
        <h4 className="mx-auto mt-2 max-w-xl text-center leading-8 text-neutral-soft-content">
          Start growing your community today.
        </h4>
        <div className="mx-auto mt-10 flex max-w-md items-center justify-center gap-x-10 rounded-xl">
          <a
            href="/"
            className="flex items-center justify-center text-sm font-semibold leading-6 text-neutral-soft"
            target="_blank"
            rel="noreferrer"
          >
            <Button btnStyle="filled">Launch App</Button>
          </a>
          <a
            href="https://calendly.com/gardens-demo"
            className="flex items-center justify-center text-sm font-semibold leading-6 text-gray-900"
            target="_blank"
            rel="noreferrer"
          >
            <Button btnStyle="outline">Book Demo</Button>
          </a>
        </div>
      </div>
    </motion.div>
  );
};
