"use client";

import { Breadcrumbs, GoBackButton } from "@/components";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-primary flex flex-col gap-4 relative overflow-x-visible">
      <div className="fixed top-[71px] left-0 lg:left-[74px] right-0 z-20 flex items-center gap-1 px-4 lg:px-6 py-2 border-b border-gray-200 bg-white">
        <GoBackButton />
        <Breadcrumbs />
      </div>
      {/* Main Content */}
      <main className="px-4 lg:px-8 border2 mt-10 container mx-auto z-10 relative min-h-screen">
        <div className="grid grid-cols-12 gap-6">{children}</div>
      </main>
    </div>
  );
}
