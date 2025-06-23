import { motion, useScroll, useTransform } from "motion/react";
import { ReactNode, useRef } from "react";

export const Title = ({
  heading,
  subHeading,
  inverted = false,
}: {
  heading: string;
  subHeading: string;
  inverted?: boolean;
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
      className="mx-auto text-center text-3xl font-semibold py-14 mb-2"
      style={{
        y,
        opacity,
      }}
    >
      <div className="flex flex-col items-center justify-between gap-2 md:px-8">
        <h2
          className={`text-3xl font-bold md:text-5xl lg:text-6xl ${inverted ? "text-neutral-soft-content" : "text-neutral-content"}`}
        >
          {heading}
        </h2>
        <h3
          className={`font-chakra text-2xl md:text-4xl lg:text-5xl ${inverted ? "" : "text-neutral-soft-content"}`}
        >
          {subHeading}
        </h3>
      </div>
    </motion.h3>
  );
};
