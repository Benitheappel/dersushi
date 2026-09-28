import { copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const out = path.resolve("out");
if (!existsSync(out)) process.exit(0);

let copied = 0;

function flatten(dir, prefix) {
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    const flat = `${prefix}.${name}`;
    if (statSync(file).isDirectory()) flatten(file, flat);
    else {
      copyFileSync(file, flat);
      copied++;
    }
  }
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    if (!statSync(file).isDirectory() || name === "_next") continue;
    if (name.startsWith("__next.")) flatten(file, file);
    else walk(file);
  }
}

walk(out);
console.log(`fix-export: ${copied} Prefetch-Datei(en) für GitHub Pages ergänzt`);
