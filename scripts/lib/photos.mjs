import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT, url } from "./paths.mjs";
import { escapeHtml } from "./layout.mjs";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

export function parsePhotoField(body) {
  if (!body?.trim()) return "";
  for (const line of body.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("<!--")) continue;
    return t.replace(/^`(.+)`$/, "$1").trim();
  }
  return "";
}

/** Resolve repo-relative path to an image under logs/ (no traversal). */
export function resolvePhotoPath(logAbsPath, photoField) {
  if (!photoField) return null;

  let candidate = photoField;
  if (!photoField.includes("/")) {
    candidate = path.join(path.dirname(logAbsPath), photoField).replace(/\\/g, "/");
  }
  const abs = path.isAbsolute(candidate)
    ? candidate
    : path.join(REPO_ROOT, candidate.replace(/^\//, ""));

  const relToRoot = path.relative(REPO_ROOT, abs).replace(/\\/g, "/");
  if (relToRoot.startsWith("..") || path.isAbsolute(relToRoot)) return null;
  if (!relToRoot.startsWith("logs/")) return null;
  if (!IMAGE_EXT.has(path.extname(relToRoot).toLowerCase())) return null;
  return relToRoot;
}

export function enrichRecordPhoto(record, logAbsPath) {
  const photoField = parsePhotoField(record.sections?.["写真"] ?? "");
  const photoRepoRel = photoField ? resolvePhotoPath(logAbsPath, photoField) : null;
  const photoExists = photoRepoRel ? fs.existsSync(path.join(REPO_ROOT, photoRepoRel)) : false;
  const photoDistRel = photoRepoRel ? photoRepoRel.replace(/^logs\//, "media/logs/") : null;
  const photoWebPath = photoExists && photoDistRel ? photoDistRel : null;
  return {
    photoField: photoField || null,
    photoRepoRel,
    photoExists,
    photoDistRel,
    photoWebPath,
  };
}

export function copyLogPhotosToDist(records, outDir) {
  for (const record of records) {
    if (!record.photoExists || !record.photoRepoRel) continue;
    const src = path.join(REPO_ROOT, record.photoRepoRel);
    const dest = path.join(outDir, record.photoDistRel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

export function photoAltText(record) {
  const parts = [record.wineName || record.displayTitle, record.vintage, record.producer].filter(Boolean);
  return parts.length ? `${parts.join(" · ")} のボトル写真` : "ボトル写真";
}

export function renderPhotoDetail(record, base) {
  if (record.photoExists && record.photoWebPath) {
    const src = url(base, record.photoWebPath);
    const alt = escapeHtml(photoAltText(record));
    return `<figure class="log-photo">
      <img src="${escapeHtml(src)}" alt="${alt}" width="640" loading="lazy" decoding="async">
    </figure>`;
  }
  if (record.photoField && !record.photoExists) {
    return `<p class="log-photo-missing" role="status">写真は未登録です（再アップロード後に <code>${escapeHtml(record.photoField)}</code> を置くと表示されます）。</p>`;
  }
  return "";
}

export function renderPhotoListing(record, base) {
  if (!record.photoExists || !record.photoWebPath) return "";
  const src = url(base, record.photoWebPath);
  const alt = escapeHtml(photoAltText(record));
  return `<img class="log-list__thumb" src="${escapeHtml(src)}" alt="" width="56" height="74" loading="lazy" decoding="async">`;
}
