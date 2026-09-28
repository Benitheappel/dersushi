import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function config(phase: string): NextConfig {
  const dev = phase === PHASE_DEVELOPMENT_SERVER;
  const basePath = dev ? "" : (process.env.PAGES_BASE_PATH ?? "").replace(/\/$/, "");

  return {
    reactStrictMode: true,
    poweredByHeader: false,
    ...(dev ? {} : { output: "export", trailingSlash: true }),
    basePath,
    env: { NEXT_PUBLIC_BASE_PATH: basePath },
    pageExtensions: dev ? ["tsx", "ts", "dev.ts"] : ["tsx", "ts"],
  };
}
