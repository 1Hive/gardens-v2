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
import { truncateString } from "@/utils/text";

interface Breadcrumb {
  href: string;
  label: string;
}



export function Breadcrumbs() {
  const path = usePathname();
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const notAuditedDisclaimerAckStorageKey = "NotAuditedDisclaimerAck";
  const [openDisclaimer, setOpenDisclaimer] = useState(false);

  useEffect(() => {
    const disclaimerAcknowledged = localStorage.getItem(
      notAuditedDisclaimerAckStorageKey,
    );
    setOpenDisclaimer(disclaimerAcknowledged !== "true");
  }, []);

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

  const handleDisclaimerAcknowledgment = () => {
    setOpenDisclaimer(false);
    localStorage.setItem(notAuditedDisclaimerAckStorageKey, "true");
  };

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
          <div className="border1 pointer-events-auto max-w-xl rounded-xl bg-neutral p-6 shadow-lg flex flex-col gap-4 items-start justify-start">
            <div className="flex gap-2 items-center">
              <ExclamationTriangleIcon className="w-8 h-8 text-danger-button" />
              <h5>Disclaimer</h5>
            </div>
            <p className="text-wrap text-justify">
              Our smart contracts{" "}
              <span className="subtitle2">have not been audited</span> yet. Be
              cautious and proceed at your own risk.
            </p>
            <div>
              <Button
                btnStyle="filled"
                onClick={handleDisclaimerAcknowledgment}
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
