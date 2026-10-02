import type { Metadata } from "next";
import HofVerwaltung from "@/components/contest/HofVerwaltung";

export const metadata: Metadata = { title: "Hall of Fame verwalten" };

export default function Verwalten() {
  return <HofVerwaltung />;
}
