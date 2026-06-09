"use client";

import { Breadcrumbs, GoBackButton } from "@/components";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-primary flex flex-col gap-4 overflow-x-visible">
      <div className="fixed top-[79px] left-0 right-0 z-20 flex items-center gap-4 px-4 lg:px-6 py-1 border-b border-border-neutral dark:border-border-neutral/50 bg-neutral">
        <GoBackButton />
        <Breadcrumbs />
      </div>
      {/* Main Content */}
      <main className="container z-10 mx-auto mt-10 flex-1 p-6 xl:max-w-7xl">
        <div className="grid grid-cols-12 gap-6">{children}</div>
      </main>
    </div>
  );
}
