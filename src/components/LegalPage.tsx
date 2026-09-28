import { isEmpty, t } from "@/content/texts";
import styles from "./legal.module.css";

type Section = { titel: string; absaetze: string[] };

const LABELS: Record<string, string> = {
  verantwortlicher: "NAME",
  ort: "WOHNORT",
  kontaktEmail: "KONTAKT-E-MAIL",
  hosting: "HOSTING-ANBIETER",
  supabaseRegion: "SUPABASE-REGION",
  loeschfrist: "LÖSCHFRIST",
  stand: "DATUM",
};

function Filled({ text }: { text: string }) {
  const values = t.datenschutzSeite as unknown as Record<string, string>;
  const parts = text.split(/(\{\w+\}|https?:\/\/\S+|www\.\S+)/g);
  return (
    <>
      {parts.map((part, i) => {
        const key = part.match(/^\{(\w+)\}$/)?.[1];
        if (key) {
          const value = values[key];
          if (isEmpty(value)) return <span key={i} className="missing">[{LABELS[key] ?? key} FEHLT]</span>;
          if (key === "kontaktEmail") return <a key={i} href={`mailto:${value}`}>{value}</a>;
          return <span key={i}>{value}</span>;
        }
        if (/^(https?:\/\/|www\.)/.test(part)) {
          const clean = part.replace(/[.,)]+$/, "");
          const href = clean.startsWith("www.") ? `https://${clean}` : clean;
          return (
            <span key={i}>
              <a href={href} target="_blank" rel="noopener noreferrer">
                {clean}
              </a>
              {part.slice(clean.length)}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default function LegalPage({ ueberschrift, abschnitte, fuss }: { ueberschrift: string; abschnitte: Section[]; fuss?: string }) {
  return (
    <article className={styles.page}>
      <h1 className="win-h1">{ueberschrift}</h1>
      <hr className="win-rule" />
      <div className={`win-box ${styles.doc}`}>
        {abschnitte.map((s, i) => (
          <section key={i}>
            <h2>{s.titel}</h2>
            {s.absaetze.map((a, j) => (
              <p key={j}>
                <Filled text={a} />
              </p>
            ))}
          </section>
        ))}
        {fuss && (
          <p className={styles.stand}>
            <Filled text={fuss} />
          </p>
        )}
      </div>
    </article>
  );
}
