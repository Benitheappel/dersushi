import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { t } from "@/content/texts";

const i = t.impressumSeite;

export const metadata: Metadata = { title: i.browserTitel };

export default function Impressum() {
  return <LegalPage ueberschrift={i.ueberschrift} abschnitte={i.abschnitte} />;
}
