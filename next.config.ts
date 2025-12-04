import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

const withMDX = createMDX();

export default withMDX(nextConfig);
