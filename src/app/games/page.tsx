import type { Metadata } from "next";
import Deadlines from "@/components/games/Deadlines";
import { t } from "@/content/texts";
import PixelIcon from "@/components/PixelIcon";
import styles from "./games.module.css";

const g = t.spiele;

export const metadata: Metadata = {
  title: g.browserTitel,
  description: `${g.spielTitel}. ${g.spielUntertitel}`,
};

export default function Games() {
  return (
    <>
      <h1 className="win-h1">{g.ueberschrift}</h1>
      <p className="win-lead">{g.untertitel}</p>
      <hr className="win-rule" />
      <section id="deadlines" className={`win-panel ${styles.game}`} aria-labelledby="deadlines-title">
        <div className="win-titlebar">
          <span>
            <PixelIcon name="joystick" size={15} /> DEADLINES.EXE
          </span>
        </div>
        <div className={styles.inner}>
          <h2 id="deadlines-title" className="win-h2">
            {g.spielTitel}
          </h2>
          <p>{g.spielUntertitel}</p>
          <p className={styles.how}>{g.soGehts}</p>
          <Deadlines />
        </div>
      </section>
    </>
  );
}
