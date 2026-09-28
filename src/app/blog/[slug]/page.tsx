import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Artikel from "@/components/blog/Artikel";
import styles from "@/components/blog/blog.module.css";
import { alleBeitraege, beitrag } from "@/content/blog";
import { t } from "@/content/texts";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  const liste = alleBeitraege().map((p) => ({ slug: p.slug }));
  return liste.length ? liste : [{ slug: "_" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = beitrag((await params).slug);
  return p ? { title: p.titel, description: p.zusammenfassung || undefined } : {};
}

export default async function BlogBeitrag({ params }: Props) {
  const { slug } = await params;
  const p = beitrag(slug);
  if (!p) notFound();
  const liste = alleBeitraege();
  const i = liste.findIndex((x) => x.slug === slug);
  const neuer = liste[i - 1];
  const aelter = liste[i + 1];

  return (
    <>
      <p className={styles.back}>
        <Link href="/blog" className="btn">
          {t.blog.zurueck}
        </Link>
        {process.env.NODE_ENV === "development" && (
          <Link href={`/blog/schreiben?slug=${slug}`} className="btn">
            ✎ Bearbeiten
          </Link>
        )}
      </p>

      <Artikel b={p} />

      {(neuer || aelter) && (
        <nav className={styles.pager} aria-label="Weitere Beiträge">
          {neuer && (
            <Link href={`/blog/${neuer.slug}`}>
              {t.blog.neuerer}
              <span>{neuer.titel}</span>
            </Link>
          )}
          {aelter && (
            <Link href={`/blog/${aelter.slug}`} className={styles.older}>
              {t.blog.aelterer}
              <span>{aelter.titel}</span>
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
