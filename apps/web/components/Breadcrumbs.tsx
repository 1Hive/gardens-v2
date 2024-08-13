"use client";

import React, { useEffect, useState } from "react";
import {
  ChevronRightIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./Button";
import { getTitlesFromUrlSegments } from "@/services/getTitlesFromUrlSegments";

interface Breadcrumb {
  href: string;
  label: string;
}

const truncateString = (str: string) => {
  return `${str.slice(0, 6)}...${str.slice(-4)}`;
};

export function Breadcrumbs() {
  const path = usePathname();
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const notAuditedDisclaimerAckStorageKey = "NotAuditedDisclaimerAck"
  // Checking in the storage if user already acknowledge then no need to reprompt
  const [openDisclaimer, setOpenDisclaimer] = useState(localStorage.getItem(notAuditedDisclaimerAckStorageKey, false) == "false");

  const fetchBreadcrumbs = async (): Promise<Breadcrumb[]> => {
    const segments = path.split("/").filter((segment) => segment !== "");

    const titles = await getTitlesFromUrlSegments(segments);

    return segments
      .map((segment, index) => {
        if (index < 2) {
          return undefined;
        }

        const href = `/${segments.slice(0, index + 1).join("/")}`;
        let displayLabel =
          segment.startsWith("0x") ? truncateString(segment) : segment;

        if (titles) {
          // index correction as first 2 segments are /gardens/[chainId]
          const title = titles[index - 2];
          if (title) {
            displayLabel = title;
          }
        }
        return { href, label: displayLabel };
      })
      .filter((segment): segment is Breadcrumb => segment !== undefined);
  };

  useEffect(() => {
    (async () => {
      const result = await fetchBreadcrumbs();
      setBreadcrumbs(result);
    })();
  }, [path]);

  if (!breadcrumbs.length) {
    return <></>;
  }

  return (
    <>
      <div className="my-[2px] border-l-2 border-solid border-neutral-soft-content" />
      <div aria-label="Breadcrumbs" className="flex w-full items-center">
        <ol className="flex w-full items-center overflow-hidden">
          {breadcrumbs.map(({ href, label }, index) => (
            <li
              key={href}
              className="flex max-w-[30%] items-center overflow-hidden text-neutral-soft-content"
            >
              {index !== 0 && (
                <ChevronRightIcon className="mx-1 h-5 w-5 flex-shrink-0" />
              )}
              {index === breadcrumbs.length - 1 ?
                <span className="subtitle2 truncate font-semibold text-neutral-soft-content">
                  {label}
                </span>
              : <Link
                  href={href}
                  className="subtitle2 truncate font-semibold text-primary-content"
                >
                  {label}
                </Link>
              }
            </li>
          ))}
        </ol>
      </div>
      {openDisclaimer && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 px-6 pb-6 z-10">
          <div className="pointer-events-auto max-w-xl rounded-xl bg-neutral p-6 shadow-lg flex flex-col gap-4 items-start justify-start">
            <div className="flex gap-2 items-center">
              <ExclamationTriangleIcon className="w-8 h-8 text-danger-button" />
              <h5>Disclaimer</h5>
            </div>
            <p className="text-wrap text-justify">
              You are exploring the frontier with our contracts.{" "}
              <span className="subtitle2">
                Please note that they have not been audited yet
              </span>
              . Exercise caution and proceed at your own risk.
            </p>
            <div>
              <Button
                btnStyle="filled"
                onClick={() => setOpenDisclaimer(false)}
                color="danger"
              >
                I understand
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
