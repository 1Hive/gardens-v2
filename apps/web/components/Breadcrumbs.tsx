"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
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

  const breadcrumbsPromise = useMemo(async (): Promise<Breadcrumb[]> => {
    const segments = path.split("/").filter((segment) => segment !== "");

    const titles = await getTitlesFromUrlSegments(segments);

    return segments
      .map((segment, index) => {
        if (index < 2) {
          return undefined;
        }

        const href = `/${segments.slice(0, index + 1).join("/")}`;
        let displayLabel = segment.startsWith("0x")
          ? truncateString(segment)
          : segment;

        if (!!titles) {
          // index correction as first 2 segments are /gardens/[chainId]
          const title = titles[index - 2];
          if (!!title) displayLabel = title;
        }
        return { href, label: displayLabel };
      })
      .filter((segment): segment is Breadcrumb => segment !== undefined);
  }, [path]);

  useEffect(() => {
    (async () => {
      const result = await breadcrumbsPromise;
      setBreadcrumbs(result);
    })();
  }, [breadcrumbsPromise]);

  if (!breadcrumbs.length) return null;

  return (
    <div aria-label="Breadcrumbs" className="flex items-center justify-center">
      <ol className="flex items-center justify-center">
        {breadcrumbs.map(({ href, label }, index) => (
          <li
            key={href}
            className="flex items-center justify-center text-neutral-soft-content"
          >
            {index !== 0 && <ChevronRightIcon className="mx-[6px] h-5 w-5" />}
            {index === breadcrumbs.length - 1 ? (
              <span className="font-semibold text-neutral-soft-content">
                {label}
              </span>
            ) : (
              <Link href={href} className="font-semibold text-primary-content">
                {label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
