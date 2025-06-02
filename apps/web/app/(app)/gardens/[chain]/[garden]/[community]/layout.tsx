"use client";

import { Breadcrumbs, GoBackButton } from "@/components";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-primary flex flex-col gap-4 relative overflow-x-visible">
      <div className="fixed top-[71px] left-0 lg:left-20 right-0 z-10 flex items-center gap-1 px-4 lg:px-6 py-3 border-b border-gray-200 bg-white">
        <GoBackButton />
        <Breadcrumbs />
      </div>
      {/* Main Content */}
      <main className="px-4">{children}</main>
    </div>
  );
}
