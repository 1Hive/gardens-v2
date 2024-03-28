import PoolForm from "@/components/Forms/PoolForm";
import React from "react";

export default async function CreatePool({
  params: { chain, garden, community },
}: {
  params: { chain: number; garden: string; community: string };
}) {
  return (
    <>
      <div>Community: {community}</div>
      <div>create pool form</div>
      <PoolForm />
    </>
  );
}
