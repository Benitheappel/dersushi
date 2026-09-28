import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { t } from "@/content/texts";

const d = t.datenschutzSeite;

export const metadata: Metadata = { title: d.browserTitel };

export default function Datenschutz() {
  return <LegalPage ueberschrift={d.ueberschrift} abschnitte={d.abschnitte} fuss={d.standText} />;
}
