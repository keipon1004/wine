import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

export function normalizeBase(basePath) {
  const raw = basePath ?? process.env.BASE_PATH ?? "/wine/";
  let b = raw.trim();
  if (!b.startsWith("/")) b = `/${b}`;
  if (!b.endsWith("/")) b = `${b}/`;
  return b;
}

/** Web path (with base) from dist-relative segments */
export function url(base, ...segments) {
  const rel = segments
    .filter(Boolean)
    .join("/")
    .replace(/\\/g, "/");
  return `${base}${rel}`;
}

function mdRelToWebPath(mdRel) {
  let p = mdRel.replace(/\\/g, "/");
  if (p.endsWith("/README.md")) {
    p = p.replace(/README\.md$/, "index.html");
  } else if (p.endsWith(".md")) {
    p = p.replace(/\.md$/, ".html");
  }
  // Published site flattens index entries to /regions and /grapes
  if (p.startsWith("indexes/regions/")) p = p.replace(/^indexes\//, "");
  if (p.startsWith("indexes/grapes/")) p = p.replace(/^indexes\//, "");
  if (p.startsWith("indexes/logs/")) p = p.replace(/^indexes\//, "");
  return p;
}

export function resolveMdHref(fromMdRel, href) {
  if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("#")) {
    return href;
  }
  const clean = href.split("#")[0];
  const fromDir = path.dirname(fromMdRel);
  const resolved = path.normalize(path.join(fromDir, clean)).replace(/\\/g, "/");
  return mdRelToWebPath(resolved);
}

export function mdHrefToWeb(href, base, fromMdRel = null) {
  if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("#")) {
    return href;
  }
  const webPath = fromMdRel ? resolveMdHref(fromMdRel, href) : mdRelToWebPath(href.replace(/^(\.\.\/)+/, ""));
  const parts = webPath.split("/").filter(Boolean);
  return url(base, ...parts);
}
