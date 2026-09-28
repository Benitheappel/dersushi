"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { navItems } from "@/content/site";
import { t } from "@/content/texts";
import PixelIcon from "./PixelIcon";
import PixelSushi from "./PixelSushi";
import styles from "./taskbar.module.css";

const clockFmt = new Intl.DateTimeFormat("de-AT", { timeZone: "Europe/Vienna", hour: "2-digit", minute: "2-digit" });

export default function Taskbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [clock, setClock] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const tick = () => setClock(clockFmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 10_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector("a")?.focus({ preventScroll: true });
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !startRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      startRef.current?.focus();
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = navItems.find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)));

  return (
    <div className={styles.taskbar}>
      <button
        ref={startRef}
        type="button"
        className={styles.start}
        aria-expanded={open}
        aria-controls="start-menu"
        data-open={open || undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <PixelSushi size={20} /> {t.ueberall.taskleisteStart}
      </button>

      {open && (
        <div ref={menuRef} id="start-menu" className={styles.menu}>
          <span className={styles.banner} aria-hidden="true">
            {t.ueberall.startMenueBanner}
          </span>
          <nav aria-label="Startmenü">
            <ul>
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={styles.menuItem} onClick={() => setOpen(false)}>
                    <span className={styles.menuLabel}>{item.label}</span>
                    <span className={styles.menuHint}>{item.preview}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

      <span className={styles.divider} aria-hidden="true" />

      <span className={styles.task} aria-hidden="true">
        <PixelSushi size={16} /> SUSHI.EXE{current && current.href !== "/" ? ` – ${current.label}` : ""}
      </span>

      <span className={styles.tray} aria-label={`${t.ueberall.uhrOrt} ${clock}`}>
        <PixelIcon name="speaker" size={16} />
        <time>{clock || "--:--"}</time>
      </span>
    </div>
  );
}
