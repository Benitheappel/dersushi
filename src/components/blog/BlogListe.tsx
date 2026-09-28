"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PixelIcon from "@/components/PixelIcon";
import { t } from "@/content/texts";
import { bildUrl, type BeitragMitSlug } from "@/lib/blog";
import { beitraegeLaden } from "@/lib/blogLaden";
import { Meta } from "./Artikel";
import styles from "./blog.module.css";

const b = t.blog;

export default function BlogListe() {
  const [liste, setListe] = useState<BeitragMitSlug[] | null>(null);
  const [fehler, setFehler] = useState(false);

  useEffect(() => {
    beitraegeLaden()
      .then(setListe)
      .catch(() => setFehler(true));
  }, []);

  if (fehler) return <p className={`win-box ${styles.empty}`}>{b.ladeFehler}</p>;
  if (!liste) return <p className={`win-box ${styles.empty}`} aria-busy="true">{b.laden}</p>;
  if (!liste.length) return <p className={`win-box ${styles.empty}`}>{b.keineBeitraege}</p>;

  return (
    <ul className={styles.list}>
      {liste.map((p) => (
        <li key={p.slug}>
          <Link href={`/blog/lesen?b=${p.slug}`} className={styles.card}>
            <span className={styles.thumb}>
              {p.titelbild ? <img src={bildUrl(p.titelbild) ?? ""} alt="" loading="lazy" /> : <PixelIcon name="notepad" size={56} />}
            </span>
            <span className={styles.cardBody}>
              <span className={`win-h2 ${styles.cardTitle}`}>{p.titel}</span>
              <Meta b={p} />
              {p.zusammenfassung && <span className={styles.summary}>{p.zusammenfassung}</span>}
              <span className={styles.more}>{b.weiterlesen}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
