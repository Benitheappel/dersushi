import Link from "next/link";
import { navItems } from "@/content/site";
import { fullName, profile } from "@/content/profile";
import { promises } from "@/content/promises";
import { isEmpty, t } from "@/content/texts";
import PixelSushi from "@/components/PixelSushi";
import styles from "./home.module.css";

export default function Home() {
  const s = t.start;
  const facts = [
    { label: s.faktenName, value: fullName },
    { label: s.faktenKlasse, value: isEmpty(profile.klasse) ? null : profile.klasse },
    { label: s.faktenSchule, value: profile.schule },
    { label: s.faktenSchuljahr, value: profile.schuljahr },
    { label: s.faktenKandidatur, value: profile.kandidatur },
    { label: s.faktenStatus, value: s.faktenStatusWert },
  ];

  return (
    <>
      <h1 className="win-h1">
        <PixelSushi size={48} className={styles.flag} /> {s.willkommen} <PixelSushi size={48} className={styles.flag} />
      </h1>

      <hr className="win-rule" />

      <div className={`win-box ${styles.intro}`}>
        <p>
          {s.vorstellungSaetze.join(" ")}{" "}
          <Link href="/wieso">{s.vorstellungLink}</Link>
        </p>
        <p className={styles.small}>{s.legalSatz}</p>
      </div>

      <hr className="win-rule" />

      <div className={styles.columns}>
        <fieldset className="win-group">
          <legend>{s.versprechenUeberschrift}</legend>
          <ol className={`win-box ${styles.list}`}>
            {promises.map((p) => (
              <li key={p._id}>
                <Link href={`/promises#${p._id}`} className={styles.listRow}>
                  <span className={styles.no}>{p.nummer}</span>
                  <span>
                    <strong>{p.titel}</strong>
                    <span className={styles.short}>{p.kurzfassung}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <p className={styles.actions}>
            <Link href="/promises" className="btn">
              {s.versprechenAllesLesen}
            </Link>
          </p>
        </fieldset>

        <fieldset className="win-group">
          <legend>{s.steckbriefUeberschrift}</legend>
          <dl className={`win-box ${styles.facts}`}>
            {facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}:</dt>
                <dd>{f.value ?? <span className="missing">{t.ueberall.platzhalterFehlt}</span>}</dd>
              </div>
            ))}
          </dl>
        </fieldset>
      </div>

      <hr className="win-rule" />

      <figure className={styles.quote}>
        <blockquote>„{t.ueberall.zufallsZitat}“</blockquote>
        <figcaption>{s.zitatQuelle}</figcaption>
      </figure>

      <fieldset className={`win-group ${styles.more}`}>
        <legend>{s.mehrUeberschrift}</legend>
        <div className={styles.buttons}>
          {navItems.slice(1).map((item) => (
            <Link key={item.href} href={item.href} className="btn" title={item.preview}>
              {item.label}
            </Link>
          ))}
        </div>
      </fieldset>
    </>
  );
}
