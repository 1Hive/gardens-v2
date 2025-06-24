import React from "react";
import { CommunityForm } from "@/components/Forms";

export default function Page() {
  return (
    <div className="page-layout mx-auto">
      <section className="section-layout">
        <div className="text-center sm:mt-5 mb-12">
          <h2 className="mb-2">Create your community on Gardens</h2>
        </div>
        <CommunityForm />
      </section>
    </div>
  );
}
