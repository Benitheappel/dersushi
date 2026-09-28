import type { Metadata } from "next";
import Link from "next/link";
import { Meta } from "@/components/blog/Artikel";
import styles from "@/components/blog/blog.module.css";
import PixelIcon from "@/components/PixelIcon";
import { alleBeitraege } from "@/content/blog";
import { t } from "@/content/texts";
import { bildUrl } from "@/lib/blog";

const b = t.blog;

export const metadata: Metadata = {
  title: b.browserTitel,
  description: b.untertitel,
};

export default function Blog() {
  const liste = alleBeitraege();
  return (
    <>
      <h1 className="win-h1">{b.ueberschrift}</h1>
      <p className="win-lead">{b.untertitel}</p>
      {process.env.NODE_ENV === "development" && (
        <p className={styles.devBar}>
          <Link href="/blog/schreiben" className="btn">
            ✎ Neuer Beitrag
          </Link>
          <span>(nur lokal sichtbar)</span>
        </p>
      )}

      <hr className="win-rule" />

      {liste.length ? (
        <ul className={styles.list}>
          {liste.map((p) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`} className={styles.card}>
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
      ) : (
        <p className={`win-box ${styles.empty}`}>{b.keineBeitraege}</p>
      )}
    </>
  );
}
