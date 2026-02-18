import { useState, useRef, useEffect } from "react";
import { ChevronUpIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./Button";

interface ExpandableComponentProps {
  title: string;
  count?: number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  withLayout?: boolean;

  /** Preview mode props */
  previewHeight?: number; // altura en px para el preview
  readMoreLabel?: string;
  readLessLabel?: string;

  /** Description mode - solo read more/less, sin header expandible */
  withDescription?: boolean;
}

export const ExpandableComponent = ({
  title,
  defaultExpanded = true,
  children,
  withLayout = false,
  previewHeight = 100,
  readMoreLabel = "Read more",
  readLessLabel = "Show less",
  withDescription = false,
}: ExpandableComponentProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current || !withDescription) return;

    const element = contentRef.current;
    const hasOverflow = element.scrollHeight > previewHeight;
    setNeedsExpansion(hasOverflow);
  }, [children, previewHeight, withDescription]);

  const showPreview = !expanded && previewHeight && withDescription;

  if (withDescription) {
    return (
      <div
        className={`flex flex-col gap-0 ${withLayout ? "section-layout" : ""}`}
      >
        {/* Content */}
        <AnimatePresence initial={false}>
          {(expanded || showPreview) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{
                opacity: 1,
                height: expanded ? "auto" : previewHeight,
              }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                type: "spring",
                stiffness: 240,
                damping: 15,
                mass: 0.3,
              }}
              className="relative"
              style={{ overflow: showPreview ? "hidden" : "visible" }}
            >
              <div ref={contentRef}>{children}</div>
              {showPreview && needsExpansion && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-base-100 to-transparent dark:from-neutral " />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {showPreview && needsExpansion && (
          <div className="flex items-start">
            <Button
              onClick={() => setExpanded(true)}
              btnStyle="link"
              color="primary"
              className="!-ml-2"
            >
              {readMoreLabel}
            </Button>
          </div>
        )}

        {expanded && needsExpansion && (
          <Button
            onClick={() => setExpanded(false)}
            btnStyle="link"
            color="primary"
            className="self-start"
          >
            {readLessLabel}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-4 ${withLayout ? "section-layout" : ""}`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-left"
        aria-expanded={expanded}
      >
        <h3>{title}</h3>

        <motion.div
          animate={{ rotate: expanded ? 0 : 180 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          <ChevronUpIcon className="w-5 h-5" strokeWidth={3} />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{
              opacity: 1,
              height: "auto",
            }}
            exit={{ opacity: 0, height: 0 }}
            transition={{
              type: "spring",
              stiffness: 240,
              damping: 15,
              mass: 0.3,
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
