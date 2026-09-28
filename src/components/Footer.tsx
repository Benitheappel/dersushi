import Link from "next/link";
import { fullName, profile } from "@/content/profile";
import { t } from "@/content/texts";
import styles from "./footer.module.css";

export default function Footer() {
  const u = t.ueberall;
  return (
    <footer className={styles.footer}>
      <hr className="win-rule" />
      <div className={styles.row}>
        <p>
          <strong>{fullName}</strong> — {u.fusszeileKandidat}: {profile.kandidatur}, {profile.schule} · {u.fusszeileSchuljahr}{" "}
          {profile.schuljahr}
        </p>
        <p className={styles.copy}>
          <Link href="/datenschutz">{u.fusszeileDatenschutz}</Link> · <Link href="/impressum">{u.fusszeileImpressum}</Link> · © 2026{" "}
          {profile.spitzname}
        </p>
      </div>
      <ul className={styles.lines}>
        {u.fusszeile.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      <p className={styles.secret}>{u.fusszeileGeheimnisHinweis.join(" ")}</p>
    </footer>
  );
}
