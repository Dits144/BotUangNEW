import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root,
  },
  async redirects() {
    return [
      {
        source: "/dashboard/transactions",
        destination: "/dashboard/#transactions",
        permanent: false,
      },
      {
        source: "/dashboard/participants",
        destination: "/dashboard/#participants",
        permanent: false,
      },
      {
        source: "/dashboard/todos",
        destination: "/dashboard/#todos",
        permanent: false,
      },
      {
        source: "/dashboard/reminders",
        destination: "/dashboard/#reminders",
        permanent: false,
      },
      {
        source: "/dashboard/commands",
        destination: "/dashboard/#commands",
        permanent: false,
      },
      {
        source: "/dashboard/settings",
        destination: "/dashboard/#settings",
        permanent: false,
      },
      {
        source: "/dashboard/calculator",
        destination: "/dashboard/#calculator",
        permanent: false,
      },
      {
        source: "/dashboard/owner",
        destination: "/dashboard/#owner",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
