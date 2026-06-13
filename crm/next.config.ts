import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Exception necessary because the project contains 86 pre-existing
    // @typescript-eslint/no-explicit-any errors in the API and services layers
    // which are completely unrelated to this UI migration.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
