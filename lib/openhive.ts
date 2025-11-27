import { OpenHive } from "@open-hive/sdk";

const getBaseUrl = () => {
  // 1. Try environment variable (works on server, or if baked in on client)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  // 2. Fallback to browser origin if on client
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // 3. Default fallback for server-side if env var is missing
  return "http://localhost:3000";
};

export const openhive = new OpenHive({
  registryUrl: getBaseUrl() + "/api",
});
