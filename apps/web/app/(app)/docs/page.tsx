import React from "react";
import { logOnce } from "@/utils/log";

export default function Page() {
  logOnce("debug", "Loading page: (app)/docs/page.tsx");
  return <div>Docs...</div>;
}

