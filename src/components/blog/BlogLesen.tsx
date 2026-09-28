"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { t } from "@/content/texts";
import type { BeitragMitSlug } from "@/lib/blog";
import { beitraegeLaden } from "@/lib/blogLaden";
import Artikel from "./Artikel";
import styles from "./blog.module.css";

const b = t.blog;

export default function BlogLesen() {
  const slug = useSearchParams().get("b") ?? "";
  const [liste, setListe] = useState<BeitragMitSlug[] | null>(null);
  const [fehler, setFehler] = useState(false);

  useEffect(() => {
    beitraegeLaden()
      .then(setListe)
      .catch(() => setFehler(true));
  }, []);

  const i = liste?.findIndex((x) => x.slug === slug) ?? -1;
  const p = liste?.[i];
  const neuer = liste?.[i - 1];
  const aelter = liste?.[i + 1];

  useEffect(() => {
    if (p) document.title = `${p.titel}${t.ueberall.browserTitelAnhang}`;
  }, [p]);

  return (
    <>
      <p className={styles.back}>
        <Link href="/blog" className="btn">
          {b.zurueck}
        </Link>
        {process.env.NODE_ENV === "development" && p && (
          <Link href={`/blog/schreiben?slug=${p.slug}`} className="btn">
            ✎ Bearbeiten
          </Link>
        )}
      </p>

      {fehler ? (
        <p className={`win-box ${styles.empty}`}>{b.ladeFehler}</p>
      ) : !liste ? (
        <p className={`win-box ${styles.empty}`} aria-busy="true">
          {b.laden}
        </p>
      ) : !p ? (
        <p className={`win-box ${styles.empty}`}>{b.nichtGefunden}</p>
      ) : (
        <>
          <Artikel b={p} />
          {(neuer || aelter) && (
            <nav className={styles.pager} aria-label="Weitere Beiträge">
              {neuer && (
                <Link href={`/blog/lesen?b=${neuer.slug}`}>
                  {b.neuerer}
                  <span>{neuer.titel}</span>
                </Link>
              )}
              {aelter && (
                <Link href={`/blog/lesen?b=${aelter.slug}`} className={styles.older}>
                  {b.aelterer}
                  <span>{aelter.titel}</span>
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}
