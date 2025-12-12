// Some editors resolve Next.js subpath imports with a .js suffix and miss the
// accompanying type definitions. Re-export the official types so tooling can
// find hooks like `usePathname`.
declare module "next/navigation.js" {
  export * from "next/navigation";
}
