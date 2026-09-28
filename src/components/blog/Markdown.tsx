import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { bildUrl } from "@/lib/blog";
import styles from "./blog.module.css";

type Block =
  | { t: "h"; level: 2 | 3; text: string }
  | { t: "p"; lines: string[] }
  | { t: "quote"; blocks: Block[] }
  | { t: "ul" | "ol"; items: string[]; start: number }
  | { t: "hr" }
  | { t: "img"; alt: string; src: string; title: string }
  | { t: "code"; text: string };

const HEADING = /^(#{1,3})\s+(.+)$/;
const HR = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const QUOTE = /^>\s?/;
const UL = /^\s*[-*+]\s+/;
const OL = /^\s*(\d+)[.)]\s+/;
const FENCE = /^\s*```/;
const IMG_ONLY = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/;

const startsBlock = (l: string) => HEADING.test(l) || HR.test(l) || QUOTE.test(l) || UL.test(l) || OL.test(l) || FENCE.test(l) || IMG_ONLY.test(l.trim());

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (FENCE.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !FENCE.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push({ t: "code", text: buf.join("\n") });
      continue;
    }
    const h = line.match(HEADING);
    if (h) {
      out.push({ t: "h", level: h[1].length === 3 ? 3 : 2, text: h[2].trim() });
      i++;
      continue;
    }
    if (HR.test(line)) {
      out.push({ t: "hr" });
      i++;
      continue;
    }
    const img = line.trim().match(IMG_ONLY);
    if (img) {
      out.push({ t: "img", alt: img[1], src: img[2], title: img[3] ?? "" });
      i++;
      continue;
    }
    if (QUOTE.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i])) buf.push(lines[i++].replace(QUOTE, ""));
      out.push({ t: "quote", blocks: parseBlocks(buf.join("\n")) });
      continue;
    }
    const ordered = OL.test(line);
    if (ordered || UL.test(line)) {
      const marker = ordered ? OL : UL;
      const start = ordered ? Number(line.match(OL)![1]) : 1;
      const items: string[] = [];
      while (i < lines.length && lines[i].trim()) {
        if (marker.test(lines[i])) items.push(lines[i].replace(marker, ""));
        else if (startsBlock(lines[i])) break;
        else items[items.length - 1] += `\n${lines[i].trim()}`;
        i++;
      }
      out.push({ t: ordered ? "ol" : "ul", items, start });
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !(buf.length && startsBlock(lines[i]))) buf.push(lines[i++]);
    out.push({ t: "p", lines: buf });
  }
  return out;
}

const INLINE =
  /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|\[([^\]]+)\]\(([^)\s]+)\)|\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|`([^`]+)`|\*([^*\s][^*]*?)\*|(?<![\p{L}\p{N}])_([^_\s][^_]*?)_(?![\p{L}\p{N}])/u;

function safeHref(url: string) {
  if (/^(https?:|mailto:)/i.test(url)) return url;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  if (url.startsWith("#")) return url;
  return null;
}


function inline(text: string, key = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = text;
  let n = 0;
  while (rest) {
    const m = rest.match(INLINE);
    if (!m || m.index === undefined) {
      out.push(rest);
      break;
    }
    if (m.index > 0) out.push(rest.slice(0, m.index));
    const k = `${key}-${n++}`;
    const [whole, imgAlt, imgSrc, linkText, linkUrl, bold, bold2, strike, code, em, em2] = m;
    if (imgSrc !== undefined) {
      const src = bildUrl(imgSrc);
      out.push(src ? <img key={k} src={src} alt={imgAlt} loading="lazy" className={styles.inlineImg} /> : <span key={k} className={styles.blocked}>[fremdes Bild entfernt]</span>);
    } else if (linkUrl !== undefined) {
      const href = safeHref(linkUrl);
      const content = inline(linkText, k);
      if (!href) out.push(<Fragment key={k}>{content}</Fragment>);
      else if (href.startsWith("/")) out.push(<Link key={k} href={href}>{content}</Link>);
      else
        out.push(
          <a key={k} href={href} target={href.startsWith("#") ? undefined : "_blank"} rel="noopener noreferrer">
            {content}
          </a>,
        );
    } else if (bold !== undefined || bold2 !== undefined) out.push(<strong key={k}>{inline(bold ?? bold2, k)}</strong>);
    else if (strike !== undefined) out.push(<s key={k}>{inline(strike, k)}</s>);
    else if (code !== undefined) out.push(<code key={k}>{code}</code>);
    else if (em !== undefined || em2 !== undefined) out.push(<em key={k}>{inline(em ?? em2, k)}</em>);
    rest = rest.slice(m.index + whole.length);
  }
  return out;
}

const lines = (list: string[], key: string) =>
  list.map((l, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {inline(l, `${key}-${i}`)}
    </Fragment>
  ));

function render(blocks: Block[], key = "b"): ReactNode[] {
  return blocks.map((b, i) => {
    const k = `${key}-${i}`;
    switch (b.t) {
      case "h":
        return b.level === 2 ? <h2 key={k}>{inline(b.text, k)}</h2> : <h3 key={k}>{inline(b.text, k)}</h3>;
      case "p":
        return <p key={k}>{lines(b.lines, k)}</p>;
      case "quote":
        return <blockquote key={k}>{render(b.blocks, k)}</blockquote>;
      case "ul":
        return (
          <ul key={k}>
            {b.items.map((it, j) => (
              <li key={j}>{lines(it.split("\n"), `${k}-${j}`)}</li>
            ))}
          </ul>
        );
      case "ol":
        return (
          <ol key={k} start={b.start}>
            {b.items.map((it, j) => (
              <li key={j}>{lines(it.split("\n"), `${k}-${j}`)}</li>
            ))}
          </ol>
        );
      case "hr":
        return <hr key={k} />;
      case "code":
        return (
          <pre key={k}>
            <code>{b.text}</code>
          </pre>
        );
      case "img": {
        const src = bildUrl(b.src);
        const caption = b.title || b.alt;
        if (!src) return <p key={k} className={styles.blocked}>[fremdes Bild entfernt: nur eigene Bilder erlaubt]</p>;
        return (
          <figure key={k}>
            <img src={src} alt={b.alt} loading="lazy" />
            {caption && <figcaption>{caption}</figcaption>}
          </figure>
        );
      }
    }
  });
}

export default function Markdown({ text }: { text: string }) {
  return <div className={styles.prose}>{render(parseBlocks(text))}</div>;
}
