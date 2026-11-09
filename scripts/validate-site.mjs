import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./lib/paths.mjs";

const DIST = path.join(REPO_ROOT, "dist");
const SKIP_PREFIXES = ["http://", "https://", "mailto:", "#", "//"];

function collectHtmlFiles(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...collectHtmlFiles(full));
    else if (ent.name.endsWith(".html")) out.push(full);
  }
  return out;
}

function main() {
  if (!fs.existsSync(DIST)) {
    console.error("dist/ not found. Run npm run build first.");
    process.exit(1);
  }

  const meta = JSON.parse(fs.readFileSync(path.join(DIST, "site-meta.json"), "utf8"));
  const base = meta.basePath || "/wine/";
  const errors = [];
  const hrefRe = /href="([^"]+)"/g;
  const srcRe = /src="([^"]+)"/g;

  for (const file of collectHtmlFiles(DIST)) {
    const html = fs.readFileSync(file, "utf8");
    let m;
    while ((m = hrefRe.exec(html)) !== null) {
      const href = m[1];
      if (SKIP_PREFIXES.some((p) => href.startsWith(p))) continue;

      let targetPath;
      if (href.startsWith(base)) {
        targetPath = path.join(DIST, href.slice(base.length));
      } else if (href.startsWith("/")) {
        targetPath = path.join(DIST, href.replace(/^\//, ""));
      } else {
        targetPath = path.resolve(path.dirname(file), href);
      }

      targetPath = targetPath.split("#")[0];
      if (targetPath.endsWith("/")) targetPath = path.join(targetPath, "index.html");
      if (!fs.existsSync(targetPath)) {
        errors.push(`${path.relative(DIST, file)}: missing ${href}`);
      }
    }

    let sm;
    while ((sm = srcRe.exec(html)) !== null) {
      const src = sm[1];
      if (SKIP_PREFIXES.some((p) => src.startsWith(p))) continue;
      let targetPath;
      if (src.startsWith(base)) {
        targetPath = path.join(DIST, src.slice(base.length));
      } else if (src.startsWith("/")) {
        targetPath = path.join(DIST, src.replace(/^\//, ""));
      } else {
        targetPath = path.resolve(path.dirname(file), src);
      }
      targetPath = targetPath.split("#")[0];
      if (!fs.existsSync(targetPath)) {
        errors.push(`${path.relative(DIST, file)}: missing img src ${src}`);
      }
    }
  }

  const required = [
    "index.html",
    "about.html",
    "logs/index.html",
    "regions/index.html",
    "grapes/index.html",
    "indexes/index.html",
    "regions/france/bordeaux.html",
    "regions/france/rully.html",
    "assets/css/main.css",
    "assets/js/browse.js",
  ];
  for (const rel of required) {
    if (!fs.existsSync(path.join(DIST, rel))) {
      errors.push(`missing required artifact: ${rel}`);
    }
  }

  if (errors.length) {
    console.error("Validation failed:");
    for (const e of errors) console.error(" ", e);
    process.exit(1);
  }

  console.log(`Site validation OK (base=${base}, pages=${collectHtmlFiles(DIST).length})`);
}

main();
