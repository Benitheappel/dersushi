"use client";

import dynamic from "next/dynamic";

const DevEditor =
  process.env.NODE_ENV === "development" ? dynamic(() => import("./TextEditor"), { ssr: false }) : () => null;

export default DevEditor;
