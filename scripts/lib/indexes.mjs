import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./paths.mjs";

const REGION_LABELS = {
  "indexes/regions/france/bordeaux.md": {
    id: "bordeaux",
    label: "ボルドー",
    country: "フランス",
    kind: "region",
    webPath: "regions/france/bordeaux.html",
    mdPath: "indexes/regions/france/bordeaux.md",
  },
  "indexes/regions/france/burgundy.md": {
    id: "burgundy",
    label: "ブルゴーニュ",
    country: "フランス",
    kind: "region",
    webPath: "regions/france/burgundy.html",
    mdPath: "indexes/regions/france/burgundy.md",
    matchTerms: ["ブルゴーニュ", "bourgogne", "burgundy"],
  },
  "indexes/regions/france/champagne.md": {
    id: "champagne",
    label: "シャンパーニュ",
    country: "フランス",
    kind: "region",
    webPath: "regions/france/champagne.html",
    mdPath: "indexes/regions/france/champagne.md",
    matchTerms: ["シャンパーニュ", "champagne", "マルヌ"],
  },
  "indexes/regions/france/rully.md": {
    id: "rully",
    label: "リュリー",
    country: "フランス",
    kind: "region",
    webPath: "regions/france/rully.html",
    mdPath: "indexes/regions/france/rully.md",
    matchTerms: ["リュリー", "rully"],
  },
  "indexes/regions/japan/yamanashi.md": {
    id: "yamanashi",
    label: "山梨",
    country: "日本",
    kind: "region",
    webPath: "regions/japan/yamanashi.html",
    mdPath: "indexes/regions/japan/yamanashi.md",
  },
  "indexes/regions/italy/marche.md": {
    id: "marche",
    label: "マルチェ",
    country: "イタリア",
    kind: "region",
    webPath: "regions/italy/marche.html",
    mdPath: "indexes/regions/italy/marche.md",
    matchTerms: ["マルチェ", "marche", "レ・マルケ", "イエージ"],
  },
  "indexes/regions/france/jura.md": {
    id: "jura",
    label: "ジュラ",
    country: "フランス",
    kind: "region",
    webPath: "regions/france/jura.html",
    mdPath: "indexes/regions/france/jura.md",
    matchTerms: ["ジュラ", "jura", "アルボワ", "arbois"],
  },
};

const GRAPE_LABELS = {
  "indexes/grapes/pinot-noir.md": {
    id: "pinot-noir",
    label: "ピノ・ノワール",
    kind: "grape",
    webPath: "grapes/pinot-noir.html",
    mdPath: "indexes/grapes/pinot-noir.md",
  },
  "indexes/grapes/pinot-meunier.md": {
    id: "pinot-meunier",
    label: "ピノ・ムニエ",
    kind: "grape",
    webPath: "grapes/pinot-meunier.html",
    mdPath: "indexes/grapes/pinot-meunier.md",
  },
  "indexes/grapes/chardonnay.md": {
    id: "chardonnay",
    label: "シャルドネ",
    kind: "grape",
    webPath: "grapes/chardonnay.html",
    mdPath: "indexes/grapes/chardonnay.md",
  },
  "indexes/grapes/merlot.md": {
    id: "merlot",
    label: "メルロー",
    kind: "grape",
    webPath: "grapes/merlot.html",
    mdPath: "indexes/grapes/merlot.md",
  },
  "indexes/grapes/verdicchio.md": {
    id: "verdicchio",
    label: "ヴェルディッキオ",
    kind: "grape",
    webPath: "grapes/verdicchio.html",
    mdPath: "indexes/grapes/verdicchio.md",
  },
};

export function listIndexPages() {
  const regions = Object.values(REGION_LABELS);
  const grapes = Object.values(GRAPE_LABELS);
  return { regions, grapes };
}

export function readIndexMarkdown(relPath) {
  const abs = path.join(REPO_ROOT, relPath);
  return fs.readFileSync(abs, "utf8");
}

export function indexMetaByRel(relPath) {
  return REGION_LABELS[relPath] ?? GRAPE_LABELS[relPath] ?? null;
}

/** Parse markdown table rows with optional log links */
export function parseIndexLogLinks(md, logByRel) {
  const rows = [];
  const rowRe = /^\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/gm;
  let m;
  while ((m = rowRe.exec(md)) !== null) {
    const [_, date, wine, linkCell] = m;
    if (date.includes("---") || date.includes("飲んだ日")) continue;
    const linkMatch = linkCell.match(/\[([^\]]*)\]\(([^)]+)\)/);
    if (!linkMatch) {
      if (date.includes("まだ記録なし")) continue;
      rows.push({ date: date.trim(), wine: wine.trim(), log: null });
      continue;
    }
    const target = linkMatch[2].replace(/^\.\.\//, "").replace(/^(\.\.\/)+/, "");
    const logsMatch = target.match(/logs\/[\w\-./]+\.md/);
    const normalized = logsMatch ? logsMatch[0] : target.replace(/^(\.\.\/)+/, "").replace(/^\//, "");
    const log = logByRel.get(normalized) ?? logByRel.get(target) ?? null;
    rows.push({
      date: date.trim(),
      wine: wine.trim(),
      linkText: linkMatch[1],
      log,
    });
  }
  return rows;
}
