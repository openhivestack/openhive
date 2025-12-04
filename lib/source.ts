import { docs, meta } from "@/.source";
import { loader } from "fumadocs-core/source";

export const source = loader({
  baseUrl: "/docs",
  source: {
    files: [
      ...docs.map((doc: any) => ({
        type: "page" as const,
        path: doc.info.path,
        data: doc,
      })),
      ...meta.map((m: any) => ({
        type: "meta" as const,
        path: m.info.path,
        data: m,
      })),
    ],
  },
});
