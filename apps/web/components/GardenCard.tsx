import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Button } from ".";
import { gardenLand } from "@/assets";

interface CardProps {
  imageSrc: string;
  title: string;
  subtitle: string;
  description: string;
  link: string;
}

export function GardenCard({ garden }: { garden: CardProps }) {
  const { imageSrc, title, subtitle, description, link } = garden;

  return (
    <div className="relative flex max-w-[320px] flex-col overflow-hidden rounded-lg border-2 border-black bg-surface">
      <div className="flex flex-col gap-4 p-4">
        <div className="relative">
          {/* <Image fill src={imageSrc} alt="garden main image" /> */}
        </div>
        <div>
          <h3 className="text-center">{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div>{description}</div>
        <div className="mb-2 mt-4">
          {/* <Link href={link}> */}
          {/* </Link> */}
          <Link href={link}>
            <Button className="w-full bg-primary">Check Garden</Button>
          </Link>
        </div>
      </div>
      <Image src={gardenLand} alt="garden land" />
    </div>
  );
}
