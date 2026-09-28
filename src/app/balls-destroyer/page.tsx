import type { Metadata } from "next";
import BallsDestroyer from "./BallsDestroyer";
import { t } from "@/content/texts";

export const metadata: Metadata = {
  title: t.eierZerstoerer.browserTitel,
  description: `Countdown bis 02.10.2026, 00:00. ${t.eierZerstoerer.satzUnterTimer}`,
};

export default function Page() {
  return <BallsDestroyer />;
}
