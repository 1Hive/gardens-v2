const envFromStorage = localStorage?.getItem("env");
export const isProd =
  envFromStorage ? envFromStorage : (
    process.env.NEXT_PUBLIC_ENV_GARDENS === "prod"
  );
