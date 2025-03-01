import React from "react";
import { CommunityForm } from "@/components/Forms";

export default function Page() {
  return (
    <div className="page-layout">
      <section className="section-layout">
        <div className="text-center sm:mt-5 mb-12">
          <h2 className="mb-2">Welcome to Gardens Community Form!</h2>
        </div>
        <CommunityForm />
      </section>
    </div>
  );
}
