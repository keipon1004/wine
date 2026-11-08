import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./paths.mjs";

const PLACEHOLDER_RE =
  /^[（(].*[）)]$|^（まだ記録なし）$|^（YYYY-MM-DD）$|^（.+）$/;

function cleanField(text) {
  const t = (text ?? "").trim();
  if (!t || t === "不明" || PLACEHOLDER_RE.test(t)) return "";
  return t;
}

function parseListSection(body) {
  const lines = body
    .split("\n")
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter((l) => l && !l.startsWith("<!--"));
  return lines.map(cleanField).filter(Boolean);
}

function parseCountryRegion(body) {
  let country = "";
  let region = "";
  for (const line of body.split("\n")) {
    const cm = line.match(/\*\*国\*\*[：:]\s*(.+)/);
    const rm = line.match(/\*\*地域\*\*[：:]\s*(.+)/);
    if (cm) country = cleanField(cm[1]);
    if (rm) region = cleanField(rm[1]);
  }
  return { country, region };
}

export function parseWineLogMarkdown(content) {
  const sections = {};
  const chunks = content.split(/^## /m);
  const preamble = chunks[0] ?? "";
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const nl = chunk.indexOf("\n");
    const title = (nl === -1 ? chunk : chunk.slice(0, nl)).trim();
    const body = (nl === -1 ? "" : chunk.slice(nl + 1)).trim();
    sections[title] = body;
  }

  const { country, region } = parseCountryRegion(sections["国・地域"] ?? "");

  return {
    titleFromFile: null,
    drankOn: cleanField(sections["飲んだ日"]),
    wineName: cleanField(sections["ワイン名"]),
    producer: cleanField(sections["生産者"]),
    vintage: cleanField(sections["ヴィンテージ"]),
    country,
    region,
    grapes: parseListSection(sections["品種"] ?? ""),
    price: cleanField(sections["価格"]),
    impression: cleanField(sections["印象"]),
    drinkAgain: cleanField(sections["また飲みたいか"]),
    memo: (sections["メモ（原文）"] ?? "").trim(),
    preamble: preamble.trim(),
    sections,
  };
}

export function discoverLogFiles() {
  const logsRoot = path.join(REPO_ROOT, "logs");
  if (!fs.existsSync(logsRoot)) return [];

  const files = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.name.endsWith(".md") && ent.name !== "README.md") {
        files.push(full);
      }
    }
  }
  walk(logsRoot);
  return files.sort();
}

export function logRecordFromPath(absPath) {
  const rel = path.relative(path.join(REPO_ROOT, "logs"), absPath).replace(/\\/g, "/");
  const slug = rel.replace(/\.md$/, "");
  const id = slug.replace(/\//g, "--");
  const parsed = parseWineLogMarkdown(fs.readFileSync(absPath, "utf8"));
  const baseName = path.basename(absPath, ".md");
  const displayTitle =
    parsed.wineName ||
    baseName.replace(/^\d{4}-\d{2}-\d{2}_/, "").replace(/_/g, " ") ||
    baseName;

  return {
    id,
    slug,
    relPath: `logs/${rel}`,
    webPath: `logs/${slug}.html`,
    displayTitle,
    ...parsed,
  };
}
