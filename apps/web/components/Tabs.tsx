"use client";

import type * as React from "react";
import { Tab } from "@headlessui/react";
import cn from "classnames";

interface TabsProps {
  defaultValue?: number;
  children: React.ReactNode;
  className?: string;
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

interface TabsTriggerProps {
  children: React.ReactNode;
  className?: string;
}

interface TabsContentProps {
  children: React.ReactNode;
  className?: string;
}

function Tabs({ defaultValue = 0, children, className }: TabsProps) {
  return (
    <Tab.Group defaultIndex={defaultValue}>
      <div className={cn("flex flex-col gap-2", className)}>{children}</div>
    </Tab.Group>
  );
}

function TabsList({ children, className }: TabsListProps) {
  return (
    <Tab.List
      className={cn(
        "inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
        className,
      )}
    >
      {children}
    </Tab.List>
  );
}

function TabsTrigger({ children, className }: TabsTriggerProps) {
  return (
    <Tab
      className={({ selected }) =>
        cn(
          "inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          // Selected state with background highlight
          selected ?
            "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
          className,
        )
      }
    >
      {children}
    </Tab>
  );
}

function TabsContent({ children, className }: TabsContentProps) {
  return (
    <Tab.Panel
      className={cn(
        "flex-1 outline-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      {children}
    </Tab.Panel>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
