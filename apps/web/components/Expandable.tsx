import { useState } from "react";
import { ChevronUpIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "motion/react";

interface ExpandableComponentProps {
  title: string;
  count?: number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  withLayout?: boolean;
}

export const ExpandableComponent = ({
  title,
  defaultExpanded = true,
  children,
  withLayout = false,
}: ExpandableComponentProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div
      className={`flex flex-col gap-2 ${withLayout ? "section-layout" : ""}`}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-left"
        aria-expanded={expanded}
      >
        {withLayout ?
          <h3>{title}</h3>
        : <h4>{title}</h4>}
        <motion.div
          animate={{ rotate: expanded ? 0 : 180 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
        >
          <ChevronUpIcon className="w-5 h-5" strokeWidth={3} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{
              type: "spring",
              stiffness: 180,
              damping: 30,
              mass: 0.8,
            }}
            className="mt-1"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
