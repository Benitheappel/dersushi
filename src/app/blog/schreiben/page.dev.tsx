import type { Metadata } from "next";
import BlogEditor from "@/components/blog/BlogEditor";

export const metadata: Metadata = { title: "Blog schreiben" };

export default function Schreiben() {
  return <BlogEditor />;
}
