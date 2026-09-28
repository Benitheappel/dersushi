"use client";

import { useEffect, useRef, useState } from "react";
import type { ToastDetail } from "@/lib/browser";
import styles from "./toasts.module.css";

type Item = ToastDetail & { id: number };

export default function Toasts() {
  const [items, setItems] = useState<Item[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      if (!detail.message?.trim()) return;
      const id = ++nextId.current;
      setItems((list) => [...list.slice(-1), { ...detail, id }]);
      window.setTimeout(() => setItems((list) => list.filter((x) => x.id !== id)), detail.duration ?? 3500);
    };
    window.addEventListener("sushi:toast", onToast);
    return () => window.removeEventListener("sushi:toast", onToast);
  }, []);

  return (
    <div className={styles.stack} role="status" aria-live="polite">
      {items.map((x) => (
        <p key={x.id} className={styles.balloon}>
          {x.message}
        </p>
      ))}
    </div>
  );
}
