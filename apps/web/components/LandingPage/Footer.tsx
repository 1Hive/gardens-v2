import { motion } from "motion/react";
import Image from "next/image";
import { newLogo } from "@/assets";
import { JSX, SVGProps } from "react";

const navigation = {
  support: [
    { name: "Github", href: "https://github.com/1Hive/gardens-v2" },
    { name: "Documentation", href: "https://docs.gardens.fund/" },
    {
      name: "GG23 Gitcoin Grant",
      href: "https://app.gardens.fund/gardens/10/0x1eba7a6a72c894026cd654ac5cdcf83a46445b08/0xd3345828914b740fddd1b8ae4f4d2ce03d1e0960",
    },
  ],
  company: [
    { name: "Report a bug", href: "https://discord.com/invite/6U8YGwVRWG" },
  ],

  social: [
    {
      name: "X",
      href: "https://x.com/gardens_fund",
      icon: (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path d="M13.6823 10.6218L20.2391 3H18.6854L12.9921 9.61788L8.44486 3H3.2002L10.0765 13.0074L3.2002 21H4.75404L10.7663 14.0113L15.5685 21H20.8131L13.6819 10.6218H13.6823ZM11.5541 13.0956L10.8574 12.0991L5.31391 4.16971H7.70053L12.1742 10.5689L12.8709 11.5655L18.6861 19.8835H16.2995L11.5541 13.096V13.0956Z" />
        </svg>
      ),
    },
    {
      name: "Discord",
      href: "https://discord.com/invite/C4jhEYkqTv",
      icon: (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path
            fillRule="evenodd"
            d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.11-.08.22-.17.33-.25.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.05-.01.07.01.11.09.22.17.33.26.04.03.04.09-.01.11-.52.31-1.07.56-1.64.78-.04.01-.05.06-.04.09.32.61.68 1.19 1.07 1.74.03.02.06.03.09.01 1.72-.53 3.45-1.33 5.25-2.65.02-.01.03-.03.03-.05.44-4.53-.73-8.46-3.1-11.95-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      name: "Warpcast",
      href: "https://warpcast.com/gardens",
      icon: (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path
            fillRule="evenodd"
            d="M3 4.5L7 20h2.5l3-12 3 12H18l4-15.5h-2.5L16 17 13 5h-2l-3 12-3.5-12.5H3z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  ],
};

export const Footer = () => {
  return (
    <footer>
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 sm:pt-20 lg:px-8 lg:pt-24">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="flex flex-col gap-6">
            <span className="sr-only">Gardens logo</span>
            <div className="-m-1.5 flex items-center gap-3 p-1.5">
              <Image
                src={newLogo}
                alt="logo"
                height={40}
                width={40}
                loading="lazy"
              />
              <span className="text-2xl font-medium">Gardens</span>
            </div>
            <p className="text-balance text-sm/6 text-neutral-content">
              Gardens is a{" "}
              <a
                href="https://x.com/1HiveOrg"
                target="_blank"
                className="text-neutral-content hover:text-primary-content font-bold"
                rel="noreferrer"
              >
                1Hive
              </a>{" "}
              featured project.
            </p>
            <div className="flex gap-x-6">
              <p className="text-sm/6 text-neutral-content">
                &copy; 2025 Gardens
              </p>
            </div>
            <div className="flex gap-x-6">
              <p className="text-sm/6 text-neutral-content">
                All rights reserved.
              </p>
            </div>
          </div>
          <div className="col-span-2 flex gap-8 sm:gap-28 justify-start lg:justify-end mt-10 lg:mt-0 px-0 lg:px-10">
            <div>
              <h4 className="text-lg">Community</h4>
              <ul className="mt-6 flex-col flex space-y-4">
                {navigation.social.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="text-neutral-content hover:text-primary-content"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="sr-only">{item.name}</span>
                    <item.icon aria-hidden="true" className="size-6" />
                  </a>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-lg">Links & Info</h4>
              <ul className="mt-6 space-y-4">
                {navigation.support.map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      className="text-sm/6 text-neutral-content hover:text-primary-content"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-lg">Feedback</h4>
              <ul className="mt-6 space-y-4">
                {navigation.company.map((item) => (
                  <li key={item.name}>
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={item.href}
                      className="text-sm/6 text-neutral-content hover:text-primary-content"
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
