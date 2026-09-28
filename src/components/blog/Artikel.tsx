import { t } from "@/content/texts";
import { bildUrl, datumText, lesezeit, type Beitrag } from "@/lib/blog";
import Markdown from "./Markdown";
import styles from "./blog.module.css";

export function Meta({ b }: { b: Beitrag }) {
  return (
    <span className={styles.meta}>
      <time dateTime={b.datum}>{datumText(b.datum)}</time> · {t.blog.lesezeit.replace("{minuten}", String(lesezeit(b.inhalt)))}
      {b.entwurf && <span className={styles.draft}>ENTWURF</span>}
    </span>
  );
}

export default function Artikel({ b }: { b: Beitrag }) {
  return (
    <article>
      <header className={styles.head}>
        <h1 className="win-h1">{b.titel || "(ohne Titel)"}</h1>
        <p>
          <Meta b={b} />
        </p>
      </header>
      <div className={styles.paper}>
        {b.titelbild && (
          <figure className={styles.cover}>
            <img src={bildUrl(b.titelbild) ?? ""} alt="" />
          </figure>
        )}
        <Markdown text={b.inhalt} />
      </div>
    </article>
  );
}
