import React from "react";
import Image from "next/image";
import { clouds1, clouds2, gardenHeader } from "@/assets";
import Link from "next/link";
import { Button } from "@/components";

export default function Gardens() {
  return (
    <div>
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
      <div>search</div>
      <section>gardens</section>
    </div>
  );
}
