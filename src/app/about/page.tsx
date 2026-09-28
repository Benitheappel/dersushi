import type { Metadata } from "next";
import Link from "next/link";
import { profile } from "@/content/profile";
import { isEmpty, t } from "@/content/texts";
import PixelSushi from "@/components/PixelSushi";
import styles from "./about.module.css";

const a = t.ueberMich;
const f = a.felder;

export const metadata: Metadata = {
  title: a.browserTitel,
  description: a.untertitel,
};

const missing = <span className="missing">{t.ueberall.platzhalterFehlt}</span>;
const orMissing = (v: string) => (isEmpty(v) ? missing : v);

const rows: { field: { titel: string; quelle: string }; value: React.ReactNode }[] = [
  { field: f.name, value: `${profile.vorname} ${profile.nachname}` },
  { field: f.spitzname, value: `„${profile.spitzname}“` },
  { field: f.schule, value: profile.schule },
  { field: f.klasse, value: orMissing(profile.klasse) },
  { field: f.alter, value: orMissing(profile.alter) },
  { field: f.status, value: a.statusWert },
  { field: f.selbstbeschreibung, value: `„${profile.selbstbeschreibung}“` },
  { field: f.interessen, value: orMissing(profile.interessen) },
  { field: f.hobbies, value: orMissing(profile.hobbies) },
  { field: f.faehigkeiten, value: orMissing(profile.faehigkeiten) },
  { field: f.schwaechen, value: orMissing(profile.schwaechen) },
  { field: f.charakter, value: orMissing(profile.charakter) },
  {
    field: f.zufallsfakt,
    value: isEmpty(profile.zufallsfakt) ? (
      <>
        {missing} <em className={styles.hint}>{a.zufallsfaktHinweis}</em>
      </>
    ) : (
      profile.zufallsfakt
    ),
  },
];

export default function About() {
  return (
    <>
      <h1 className="win-h1">{a.ueberschrift}</h1>
      <p className="win-lead">{a.untertitel}</p>

      <hr className="win-rule" />

      <div className={styles.dialog}>
        <div className={styles.tabs} role="presentation">
          <span className={styles.tab}>{a.reiterAllgemein}</span>
        </div>
        <div className={styles.sheet}>
          <div className={styles.head}>
            <PixelSushi size={40} />
            <span className="win-h2">
              {profile.vorname} {profile.nachname}
            </span>
          </div>
          <hr className={styles.sep} />
          <dl className={styles.table}>
            {rows.map((r, i) => (
              <div key={i} className={styles.row}>
                <dt>{r.field.titel}:</dt>
                <dd>
                  {r.value}
                  <span className={styles.source}>
                    {a.quelleWort}: {r.field.quelle}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <hr className="win-rule" />

      <fieldset className="win-group">
        <legend>
          {a.beweisstueck}: {a.top10} — {a.top10Untertitel}
        </legend>
        <div className={styles.namesWrap}>
          <ol className={`win-box ${styles.names}`}>
            {profile.lehrerNamen.map((n, i) => (
              <li key={i}>
                <span className={styles.rank}>{String(i + 1).padStart(2, "0")}.</span>
                <del>{n.name}</del>
                {!isEmpty(n.notiz) && <span className={styles.note}>({n.notiz})</span>}
              </li>
            ))}
          </ol>
          <div className={styles.correct}>
            <p>{a.richtigTitel}:</p>
            <p className={styles.correctName}>{a.richtigName}</p>
            <p>{a.richtigSatz}</p>
          </div>
        </div>
      </fieldset>

      <p className={styles.actions}>
        <Link href="/promises" className="btn">
          {a.weiterKnopf}
        </Link>
      </p>
    </>
  );
}
