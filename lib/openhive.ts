import { OpenHive } from "@open-hive/sdk";

export const openhive = new OpenHive({
  registryUrl: process.env.NEXT_PUBLIC_APP_URL + "/api",
});