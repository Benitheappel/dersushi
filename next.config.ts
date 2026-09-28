import { existsSync } from "node:fs";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function config(phase: string): NextConfig {
  const dev = phase === PHASE_DEVELOPMENT_SERVER;
  const customDomain = existsSync("public/CNAME");
  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
  const fromPages = (process.env.PAGES_BASE_PATH ?? "").replace(/\/$/, "");
  const basePath = dev || customDomain ? "" : fromPages || (repo ? `/${repo}` : "");

  return {
    reactStrictMode: true,
    poweredByHeader: false,
    ...(dev ? {} : { output: "export", trailingSlash: true }),
    basePath,
    env: { NEXT_PUBLIC_BASE_PATH: basePath },
    pageExtensions: dev ? ["tsx", "ts", "dev.ts"] : ["tsx", "ts"],
  };
}
