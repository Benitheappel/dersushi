import type { Metadata } from "next";
import Link from "next/link";
import { interlude, promises } from "@/content/promises";
import { t } from "@/content/texts";
import PixelIcon from "@/components/PixelIcon";
import { asset } from "@/lib/asset";
import styles from "./promises.module.css";

const v = t.versprechenSeite;

export const metadata: Metadata = {
  title: v.browserTitel,
  description: promises.map((p) => p.titel).join(" · "),
};

export default function Promises() {
  const regular = promises.filter((p) => p._id !== "sushi-promise");
  const sushi = promises.find((p) => p._id === "sushi-promise")!;

  return (
    <>
      <h1 className="win-h1">{v.ueberschrift}</h1>
      <p className="win-lead">{v.untertitel}</p>

      <nav aria-label="Versprechen" className={styles.toc}>
        {promises.map((p) => (
          <a key={p._id} href={`#${p._id}`} className="btn">
            {p.nummer}
          </a>
        ))}
      </nav>

      <hr className="win-rule" />

      <div className={styles.list}>
        {regular.map((p) => (
          <fieldset key={p._id} id={p._id} className={`win-group ${styles.promise}`}>
            <legend>
              {p.nummer} — {p.ueberschriftKlein}
            </legend>
            <h2 className="win-h2">{p.titel}</h2>
            <div className={styles.body}>
              {p.absaetze.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            {p.punkte && (
              <ul className={`win-box ${styles.items}`}>
                {p.punkte.map((item, i) => (
                  <li key={i}>
                    <h3>
                      {p.nummer}.{i + 1} {item.titel}
                      {item.detailsFolgenStempel && <span className={styles.stamp}>{v.detailsFolgen}</span>}
                    </h3>
                    <p>{item.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
        ))}
      </div>

      <hr className="win-rule" />

      <p className={styles.interlude}>{interlude}</p>

      <section id={sushi._id} className={`win-panel ${styles.notepad}`} aria-labelledby="sushi-title">
        <div className="win-titlebar">
          <span>
            <PixelIcon name="notepad" size={14} /> {v.dokumentName}
          </span>
        </div>
        <div className={styles.notepadMenu} aria-hidden="true">
          <span>
            <u>D</u>atei
          </span>
          <span>
            <u>B</u>earbeiten
          </span>
          <span>
            <u>S</u>uchen
          </span>
          <span>
            <u>?</u>
          </span>
        </div>
        <div className={`win-box ${styles.paper}`}>
          <p className={styles.ref}>
            {sushi.nummer} / {sushi.ueberschriftKlein} — {v.aktenzeichen}
          </p>
          <h2 id="sushi-title" className={styles.paperTitle}>
            {sushi.titel}
          </h2>
          <ol className={styles.clauses}>
            {sushi.absaetze.map((para, i) => (
              <li key={i}>
                <span aria-hidden="true">§ {i + 1}</span>
                <p>{para}</p>
              </li>
            ))}
          </ol>
          <p className={styles.hard}>{v.grossNachVersprechen6}</p>
          <img
            src={asset("/unterschrift.png")}
            alt="Unterschrift von Benjamin Suljic"
            width={720}
            height={197}
            loading="lazy"
            decoding="async"
            className={styles.sig}
          />
          <p className={styles.sigLine}>{v.unterschriftZeile}</p>
        </div>
      </section>

      <p className={styles.actions}>
        <Link href="/balls-destroyer" className="btn">
          {v.sieheAuchKnopf}
        </Link>
      </p>
    </>
  );
}
