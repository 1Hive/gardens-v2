import { motion, useScroll, useTransform } from "motion/react";
import { ReactNode, useRef } from "react";

export const Title = ({
  heading,
  subHeading,
}: {
  heading: string;
  subHeading: string;
}) => {
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const opacity = useTransform(scrollYProgress, [0.25, 0.5, 0.75], [0, 1, 1]);

  return (
    <motion.h3
      ref={targetRef}
      className="mx-auto text-center text-3xl font-semibold text-neutral-content py-20 mb-2"
      style={{
        y,
        opacity,
      }}
    >
      <div className="flex flex-col items-center justify-between gap-4 md:px-8">
        <h2 className="max-w-lg text-3xl font-bold md:text-5xl">{heading}</h2>
        <h3 className="text-neutral-soft-content font-chakra text-2xl md:text-4xl">
          {" "}
          {subHeading}
        </h3>
      </div>
    </motion.h3>
  );
};
