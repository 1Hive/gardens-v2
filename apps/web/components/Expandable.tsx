import { useState } from "react";
import { ChevronUpIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "motion/react";

interface ExpandableComponentProps {
  title: string;
  count?: number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  withLayout?: boolean;

  /** NEW */
  previewHeight?: number; // px, e.g. 120
  readMoreLabel?: string;
  readLessLabel?: string;
}

export const ExpandableComponent = ({
  title,
  defaultExpanded = true,
  children,
  withLayout = false,
  previewHeight,
  readMoreLabel = "Read more",
  readLessLabel = "Show less",
}: ExpandableComponentProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const isPreviewMode =
    previewHeight !== undefined && previewHeight > 0 && !expanded;

  return (
    <div
      className={`flex flex-col gap-2 ${withLayout ? "section-layout" : ""}`}
    >
      {/* Header */}
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
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <ChevronUpIcon className="w-5 h-5" strokeWidth={3} />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {(expanded || previewHeight) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{
              opacity: 1,
              height: expanded ? "auto" : previewHeight,
            }}
            exit={{ opacity: 0, height: 0 }}
            transition={{
              type: "spring",
              stiffness: 180,
              damping: 30,
              mass: 0.8,
            }}
            className="relative overflow-hidden mt-1"
          >
            {children}

            {/* Blur + Read more */}
            {isPreviewMode && (
              <>
                {/* Blur gradient */}
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-primary to-transparent backdrop-blur-sm" />

                {/* CTA */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                  <button
                    onClick={() => setExpanded(true)}
                    className="btn btn-sm btn-ghost w-full"
                  >
                    {readMoreLabel}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optional collapse CTA */}
      {expanded && previewHeight && (
        <button
          onClick={() => setExpanded(false)}
          className="self-start text-sm hover:underline"
        >
          {readLessLabel}
        </button>
      )}
    </div>
  );
};
