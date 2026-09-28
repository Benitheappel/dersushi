import type { Metadata } from "next";
import { Suspense } from "react";
import BlogLesen from "@/components/blog/BlogLesen";
import { t } from "@/content/texts";

export const metadata: Metadata = { title: t.blog.browserTitel };

export default function Lesen() {
  return (
    <Suspense>
      <BlogLesen />
    </Suspense>
  );
}
