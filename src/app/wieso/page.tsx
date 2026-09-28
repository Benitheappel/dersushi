import type { Metadata } from "next";
import InfiniteLoader from "./InfiniteLoader";
import { t } from "@/content/texts";

export const metadata: Metadata = {
  title: t.wieso.browserTitel,
  description: "Die Antwort lädt noch.",
};

export default function Page() {
  return <InfiniteLoader />;
}
