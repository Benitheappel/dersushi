type Sprite = { rows: string[]; colors: Record<string, string> };

const WIN = { K: "#000000", W: "#ffffff", G: "#c0c0c0", D: "#808080" };
const FOLDER = { ...WIN, Y: "#ffd94a", y: "#b58b00" };

const SPRITES = {
  sushi: {
    rows: [
      "...KKKKKKKKKK...",
      ".KKOOLOONNOOOKK.",
      "KOOOLOOONNOOLOOK",
      "KDOOOLOONNOOOLDK",
      "KDDDDDDNNDDDDDDK",
      "KWWWWWWNNWWWWWWK",
      "KWWWWWWNNWWWWWGK",
      "KWWWWWWNNWWWWGGK",
      "KGWWWWWNNWWWGGGK",
      ".KGGGGGNNGGGGGK.",
      "..KKKKKKKKKKKK..",
    ],
    colors: { K: "#000000", O: "#ff7a3d", L: "#ffc4a3", D: "#d9481c", N: "#1d3b24", W: "#ffffff", G: "#c6c6c6" },
  },
  folder: {
    rows: [
      "..KKKKK.........",
      ".KyYYYyK........",
      "KyYYYYYyKKKKKKK.",
      "KYYYYYYYYYYYYYyK",
      "KYWWWWWWWWWWWWyK",
      "KYYYYYYYYYYYYYyK",
      "KYYYYYYYYYYYYYyK",
      "KYYYYYYYYYYYYYyK",
      "KYYYYYYYYYYYYYyK",
      "KYYYYYYYYYYYYYyK",
      "KyyyyyyyyyyyyyyK",
      ".KKKKKKKKKKKKKK.",
    ],
    colors: FOLDER,
  },
  folderOpen: {
    rows: [
      "..KKKKK.........",
      ".KyYYYyK........",
      "KyYYYYYyKKKKKK..",
      "KYYWWWWWWWWWWYK.",
      "KYWKKKKKKKKKKKKK",
      "KYKYYYYYYYYYYYYK",
      "KKYYYYYYYYYYYYyK",
      "KYYYYYYYYYYYYyK.",
      "KYYYYYYYYYYYyK..",
      "KyyyyyyyyyyyK...",
      ".KKKKKKKKKKK....",
    ],
    colors: FOLDER,
  },
  paper: {
    rows: [
      "KKKKKKKK....",
      "KWWWWWWKK...",
      "KWWWWWWKWK..",
      "KWWWWWWKWWK.",
      "KWWWWWWKKKKK",
      "KWDDDDDDDDWK",
      "KWWWWWWWWWWK",
      "KWDDDDDDDDWK",
      "KWWWWWWWWWWK",
      "KWDDDDDDWWWK",
      "KWWWWWWWWWWK",
      "KWDDDDDDDDWK",
      "KWWWWWWWWWWK",
      "KKKKKKKKKKKK",
    ],
    colors: WIN,
  },
  notepad: {
    rows: [
      "KKKKKKKKKKKK",
      "KBBBBBBBBBBK",
      "KBbBbBbBbBBK",
      "KKKKKKKKKKKK",
      "KWWWWWWWWWWK",
      "KWDDDDDDDDWK",
      "KWWWWWWWWWWK",
      "KWDDDDDDDDWK",
      "KWWWWWWWWWWK",
      "KWDDDDDWWWWK",
      "KWWWWWWWWWWK",
      "KKKKKKKKKKKK",
    ],
    colors: { ...WIN, B: "#000080", b: "#1084d0" },
  },
  joystick: {
    rows: [
      ".....KKK......",
      "....KRRRK.....",
      "...KRRWRRK....",
      "...KRRRRRK....",
      "....KRRRK.....",
      ".....KKK......",
      "......KK......",
      "......KK......",
      "......KK......",
      "..KKKKKKKKKK..",
      ".KDDDDDDDDRDK.",
      "KDGGGGGGGGGGDK",
      "KDDDDDDDDDDDDK",
      ".KKKKKKKKKKKK.",
    ],
    colors: { ...WIN, R: "#e00000" },
  },
  speaker: {
    rows: [
      "......K.......",
      ".....KK....K..",
      "....KGK..K..K.",
      "KKKKGGK...K.K.",
      "KGGGGGK.K.K..K",
      "KGGGGGK.K.K..K",
      "KGGGGGK.K.K..K",
      "KKKKGGK...K.K.",
      "....KGK..K..K.",
      ".....KK....K..",
      "......K.......",
    ],
    colors: WIN,
  },
} satisfies Record<string, Sprite>;

export type PixelIconName = keyof typeof SPRITES;

function toDataUri({ rows, colors }: Sprite) {
  const rects = rows
    .flatMap((row, y) =>
      Array.from(row).flatMap((c, x) => (colors[c] ? [`<rect x="${x}" y="${y}" width="1" height="1" fill="${colors[c]}"/>`] : [])),
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges">${rects}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const URIS = Object.fromEntries(Object.entries(SPRITES).map(([k, s]) => [k, toDataUri(s)])) as Record<PixelIconName, string>;

export const pixelIconSrc = (name: PixelIconName) => URIS[name];

export default function PixelIcon({
  name,
  size = 16,
  className,
  style,
}: {
  name: PixelIconName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { rows } = SPRITES[name];
  return (
    <img
      src={URIS[name]}
      width={size}
      height={Math.round((size * rows.length) / rows[0].length)}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={className}
      style={{ display: "inline-block", imageRendering: "pixelated", verticalAlign: "middle", ...style }}
    />
  );
}
