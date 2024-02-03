import React from "react";
import Image from "next/image";
import { clouds1, clouds2, gardenHeader } from "@/assets";
import Link from "next/link";
import { Button, GardenCard } from "@/components";
import { cacheExchange, createClient, fetchExchange, gql } from "@urql/next";
import { registerUrql } from "@urql/next/rsc";
// import { useAccount, useConnect } from "wagmi";

const gardens = [
  {
    imageSrc: "/blank",
    title: "HNY",
    subtitle: "Lorem ipsum dolor sit amet, consectetur",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
    link: "/gardens/[[chain]]/communities",
  },
  {
    imageSrc: "/blank",
    title: "OP",
    subtitle: "Lorem ipsum dolor sit amet, consectetur",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
    link: "/#",
  },
  {
    imageSrc: "/blank",
    title: "GIV",
    subtitle: "Lorem ipsum dolor sit amet, consectetur",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
    link: "/#",
  },
  {
    imageSrc: "/blank",
    title: "ETH",
    subtitle: "Lorem ipsum dolor sit amet, consectetur",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
    link: "/#",
  },
  {
    imageSrc: "/blank",
    title: "UNI",
    subtitle: "Lorem ipsum dolor sit amet, consectetur",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
    link: "/#",
  },
  {
    imageSrc: "/blank",
    title: "ADA",
    subtitle: "Lorem ipsum dolor sit amet, consectetur",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
    link: "/#",
  },
];

const Communities = gql`
  {
    registryFactories {
      id
      registryCommunities {
        id
        registerToken
        strategies {
          id
        }
      }
    }
  }
`;

const makeClient = () => {
  return createClient({
    url: process.env.NEXT_PUBLIC_SUBGRAPH_URL || "",
    exchanges: [cacheExchange, fetchExchange],
  });
};

const { getClient } = registerUrql(makeClient);

export default async function Gardens() {
  const result = await getClient().query(Communities, {});
  // console.log("result", result);
  console.log("result", JSON.stringify(result.data.registryFactories, null, 2));
  result.data.registryFactories.map((factory: any) => {
    factory.registryCommunities.map((community: any) => {
      const registerToken = community.registerToken;
      community.strategies.map((strategy: any) => {
        console.log("strategy", strategy);
      });
    });
  });
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
                <Button className="bg-primary">Create a Garden</Button>
              </Link>
              <Link href="/docs">
                <Button className="bg-secondary">Documentation</Button>
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
