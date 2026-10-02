import type { Metadata } from "next";
import Link from "next/link";
import Contest from "@/components/contest/Contest";
import { isEmpty, t } from "@/content/texts";
import styles from "./wettbewerb.module.css";

const w = t.wettbewerb;

export const metadata: Metadata = {
  title: w.browserTitel,
  description: w.untertitel,
};

export default function Wettbewerb() {
  return (
    <>
      <h1 className="win-h1">{w.ueberschrift}</h1>
      <p className="win-lead">{w.untertitel}</p>
      {process.env.NODE_ENV === "development" && (
        <p className={styles.devBar}>
          <Link href="/wettbewerb/verwalten" className="btn">
            ✎ Hall of Fame verwalten
          </Link>
          <span>(nur lokal sichtbar)</span>
        </p>
      )}

      <hr className="win-rule" />

      <div className={styles.info}>
        <fieldset className="win-group">
          <legend>{w.regelnUeberschrift}</legend>
          <ol className={styles.steps}>
            {w.regeln.map((r, i) => (
              <li key={i}>
                <span className={styles.no}>{i + 1}</span>
                {r}
              </li>
            ))}
          </ol>
          <p className={styles.warn}>{w.regelnHinweis}</p>
        </fieldset>
        <fieldset className="win-group">
          <legend>
            {w.preisUeberschrift} & {w.einsendeschlussUeberschrift}
          </legend>
          <dl className={styles.facts}>
            <dt>{w.preisUeberschrift}:</dt>
            <dd>{isEmpty(w.preis) ? <span className="missing">{t.ueberall.platzhalterFehlt}</span> : w.preis}</dd>
            <dt>{w.einsendeschlussUeberschrift}:</dt>
            <dd>{isEmpty(w.einsendeschluss) ? <span className="missing">{t.ueberall.platzhalterFehlt}</span> : w.einsendeschluss}</dd>
          </dl>
          <p className={styles.privacy}>
            {w.datenschutz} <Link href="/datenschutz">{w.datenschutzLink}</Link>
          </p>
        </fieldset>
      </div>

      <hr className="win-rule" />

      <Contest />
    </>
  );
}
