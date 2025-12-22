"use client";

import React, { useEffect, useState } from "react";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { fetchToken } from "@wagmi/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "react-toastify";
import { Address } from "viem";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useFlag } from "@/hooks/useFlag";
import { queryByChain } from "@/providers/urql";
import {
  parseStaticSegment,
  queryMap,
} from "@/services/getTitlesFromUrlSegments";
import { truncateString } from "@/utils/text";
interface Breadcrumb {
  href: string;
  label: string;
}

export function Breadcrumbs() {
  const path = usePathname();
  const chain = useChainFromPath();
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const skipPublished = useFlag("skipPublished");

  /**
   * Fetches and parses titles from URL segments.
   * @param segments - The URL segments to process.
   * @returns A promise that resolves to an array of title strings or undefined.
   * @throws {Error} If there's an issue fetching or parsing the data.
   */
  async function getTitlesFromUrlSegments(
    segments: string[],
  ): Promise<(string | undefined)[] | undefined> {
    const segmentsLength = segments.length;
    if (segmentsLength < 3) {
      return undefined;
    }

    const isStaticSegment = segments[segmentsLength - 1].includes("create");
    const entityIndex =
      isStaticSegment ? segmentsLength - 2 : segmentsLength - 1;

    if (entityIndex === 2) {
      const tokenArgs = {
        address: segments[2] as Address,
        chainId: parseInt(segments[1]),
      };
      const tokenData = await fetchToken(tokenArgs)
        .then((token) => token?.name)
        .catch(() => {
          console.error("Error fetching token from address: ", tokenArgs);
          toast.error("Token not found");
          return undefined;
        });
      return [tokenData, parseStaticSegment(segments[segmentsLength - 1])];
    }

    const queryItem = queryMap[entityIndex];

    try {
      if (!chain) {
        throw new Error("Chain not found in path");
      }
      const result = await queryByChain(
        chain,
        queryItem.document,
        queryItem.getVariables(segments[entityIndex]),
        undefined,
        skipPublished,
      );

      if (!result?.data) {
        throw new Error("No data returned from query");
      }

      const parsedResult = await queryItem.parseResult(result.data);

      if (isStaticSegment) {
        parsedResult.push(parseStaticSegment(segments[segmentsLength - 1]));
      }

      return parsedResult;
    } catch (error) {
      console.error("Error fetching title from address:", error);
      return;
    }
  }

  const fetchBreadcrumbs = async (): Promise<Breadcrumb[]> => {
    const segments = path.split("/").filter((segment) => segment !== "");

    const titles = await getTitlesFromUrlSegments(segments);

    return segments
      .map((segment, index) => {
        if (index < 3) {
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
      <div className="my-[2px] border-l-2 border-solid border-neutral-soft-content h-5" />
      <div aria-label="Breadcrumbs" className="flex w-full items-center pt-px">
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
    </>
  );
}
