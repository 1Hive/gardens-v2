let envFromStorage;
try {
  envFromStorage = localStorage?.getItem("env");
} catch (error) {
  // ignore when not browser side
}
export const isProd =
  envFromStorage ? envFromStorage : (
    process.env.NEXT_PUBLIC_ENV_GARDENS === "prod"
  );
