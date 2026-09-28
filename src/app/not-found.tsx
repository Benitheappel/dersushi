import Link from "next/link";
import { t } from "@/content/texts";

export default function NotFound() {
  const n = t.seiteNichtGefunden;
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <section className="win-panel" style={{ width: "min(440px, 100%)" }} aria-labelledby="err-title">
        <div className="win-titlebar">
          <h1 id="err-title" style={{ font: "inherit" }}>{n.fensterTitel}</h1>
        </div>
        <div style={{ display: "flex", gap: 16, padding: "18px 16px 8px" }}>
          <span
            aria-hidden="true"
            style={{
              flex: "none",
              display: "grid",
              placeItems: "center",
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#d00000",
              color: "#fff",
              fontWeight: 700,
              fontSize: 20,
              boxShadow: "1px 1px 0 #000",
            }}
          >
            ✕
          </span>
          <div>
            <p style={{ fontWeight: 700 }}>{n.fehler}</p>
            <p>{n.ueberschrift.join(" ")}</p>
            <p style={{ marginTop: 8 }}>{n.satz}</p>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 14px" }}>
          <Link href="/" className="btn">
            {n.knopf}
          </Link>
        </div>
      </section>
    </div>
  );
}
