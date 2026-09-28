import type { Metadata } from "next";
import Link from "next/link";
import BlogListe from "@/components/blog/BlogListe";
import styles from "@/components/blog/blog.module.css";
import { t } from "@/content/texts";

const b = t.blog;

export const metadata: Metadata = {
  title: b.browserTitel,
  description: b.untertitel,
};

export default function Blog() {
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

      <BlogListe />
    </>
  );
}
