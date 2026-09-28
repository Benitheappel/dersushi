import type { Metadata, Viewport } from "next";
import { Archivo, Instrument_Serif, JetBrains_Mono, Pixelify_Sans } from "next/font/google";
import "./globals.css";

import Window from "@/components/Window";
import Taskbar from "@/components/Taskbar";
import Footer from "@/components/Footer";
import Toasts from "@/components/Toasts";
import EasterEggs from "@/components/EasterEggs";
import DevEditor from "@/components/editor/DevEditor";
import { t } from "@/content/texts";

const pixel = Pixelify_Sans({
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display", display: "swap", preload: false });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap", preload: false });
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: t.ueberall.browserTitel,
    template: `%s${t.ueberall.browserTitelAnhang}`,
  },
  description: t.ueberall.beschreibungFuerGoogle,
};

export const viewport: Viewport = {
  themeColor: "#008080",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${pixel.variable} ${display.variable} ${mono.variable} ${serif.variable}`}>
      <body>
        <a href="#main" className="skip">
          {t.ueberall.zumInhaltSpringen}
        </a>
        <Window footer={<Footer />}>{children}</Window>
        <Taskbar />
        <Toasts />
        <EasterEggs />
        <DevEditor />
      </body>
    </html>
  );
}
