import React from "react";
import Image from "next/image";
import { clouds1, clouds2, gardenHeader } from "@/assets";
import Link from "next/link";
import { Button } from "@/components";
import GardenCard from "@/components/GardenCard";
import { Key } from "heroicons-react";

const gardens = [
  {
    imageSrc: "/blanck",
    title: "Garden sample 0",
    subtitle: "Lorem ipsum dolor sit amet, consectetur",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
    link: "/href",
  },
  {
    imageSrc: "/blanck",
    title: "Garden sample 1",
    subtitle: "Lorem ipsum dolor sit amet, consectetur",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
    link: "/href",
  },
  {
    imageSrc: "/blanck",
    title: "Garden sample 2",
    subtitle: "Lorem ipsum dolor sit amet, consectetur",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
    link: "/href",
  },
  {
    imageSrc: "/blanck",
    title: "Garden sample 3",
    subtitle: "Lorem ipsum dolor sit amet, consectetur",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
    link: "/href",
  },
  {
    imageSrc: "/blanck",
    title: "Garden sample 4",
    subtitle: "Lorem ipsum dolor sit amet, consectetur",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
    link: "/href",
  },
  {
    imageSrc: "/blanck",
    title: "Garden sample 5",
    subtitle: "Lorem ipsum dolor sit amet, consectetur",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
    link: "/href",
  },
];

export default function Gardens() {
  return (
    <div className="flex flex-col items-center justify-center gap-12">
      <header className="flex flex-col items-center gap-12">
        <div className="flex items-center text-center">
          <div className="relative flex-1">
            <Image src={clouds1} alt="clouds" />
          </div>
          <div className="mx-10 flex flex-col gap-14">
            <div>
              <h1 className="text-[#084D21]">Find your tribe</h1>
              <p className="text-[18px]">
                Gardens are digital economies that anyone can help shape
              </p>
            </div>
            <div className="flex justify-center gap-6">
              <Link href="/create-garden">
                <Button>Create a Garden</Button>
              </Link>
              <Link href="/docs">
                <Button type="secondary">Documentation</Button>
              </Link>
            </div>
          </div>
          <div className="relative flex-1">
            <Image src={clouds2} alt="clouds" />
          </div>
        </div>
        <div className="relative">
          <Image src={gardenHeader} alt="gardens" />
        </div>
      </header>
      {/* <div>search</div> */}
      <section className="my-10 flex justify-center">
        {/* <div className="grid max-w-[1216px] grid-cols-[repeat(auto-fit,minmax(310px,1fr))] gap-6 md:grid-cols-[repeat(auto-fit,minmax(360px,1fr))]"> */}
        <div className="flex max-w-[1216px] flex-wrap justify-center gap-6">
          {gardens.map((garden, id) => (
            <div key={id}>
              <GardenCard garden={garden} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
