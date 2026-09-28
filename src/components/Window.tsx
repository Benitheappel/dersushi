"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navItems } from "@/content/site";
import { t } from "@/content/texts";
import { toast } from "@/lib/browser";
import PixelSushi from "./PixelSushi";
import styles from "./window.module.css";

const MAXIMISED = ["/balls-destroyer"];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

export default function Window({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  const pathname = usePathname();
  const [maxToggle, setMaxToggle] = useState<boolean | null>(null);

  useEffect(() => setMaxToggle(null), [pathname]);
  const maximised = maxToggle ?? MAXIMISED.some((p) => pathname.startsWith(p));
  const current = navItems.find((n) => isActive(pathname, n.href));

  return (
    <div className={styles.window} data-maximised={maximised || undefined}>
      <div className={`win-titlebar ${styles.titlebar}`}>
        <button
          type="button"
          className={styles.appIcon}
          aria-label="Sushi"
          onClick={() => window.dispatchEvent(new Event("sushi:logo"))}
        >
          <PixelSushi size={16} />
        </button>
        <span className={styles.title}>
          {t.ueberall.fensterTitel}
          {current && current.href !== "/" ? ` — ${current.label}` : ""}
        </span>
        <span className={styles.controls}>
          <button type="button" aria-label="Minimieren" onClick={() => toast(t.ueberall.meldungMinimieren)}>
            <span className={styles.icoMin} />
          </button>
          <button type="button" aria-label={maximised ? "Verkleinern" : "Maximieren"} onClick={() => setMaxToggle(!maximised)}>
            <span className={maximised ? styles.icoRestore : styles.icoMax} />
          </button>
          <button type="button" aria-label="Schließen" onClick={() => toast(t.ueberall.meldungSchliessen)}>
            <span className={styles.icoClose}>✕</span>
          </button>
        </span>
      </div>

      <nav className={styles.menubar} aria-label="Hauptnavigation">
        <ul>
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={styles.menuItem}
                title={item.preview}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
              >
                <span className={styles.accel}>{item.label.charAt(0)}</span>
                {item.label.slice(1)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.client}>
        <main id="main" className={styles.content}>
          {children}
        </main>
        {footer}
      </div>

      <div className={styles.statusbar} aria-hidden="true">
        {t.ueberall.statusleiste.map((s, i) => (
          <span key={i} className={styles.statusCell}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
