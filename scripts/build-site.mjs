import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import { REPO_ROOT, normalizeBase, url, mdHrefToWeb } from "./lib/paths.mjs";
import { discoverLogFiles, logRecordFromPath } from "./lib/parse-log.mjs";
import {
  listIndexPages,
  readIndexMarkdown,
  parseIndexLogLinks,
} from "./lib/indexes.mjs";
import { layout, emptyState, escapeHtml } from "./lib/layout.mjs";
import {
  copyLogPhotosToDist,
  renderPhotoDetail,
  renderPhotoListing,
} from "./lib/photos.mjs";

const BASE = normalizeBase(process.env.BASE_PATH);
const OUT = path.join(REPO_ROOT, "dist");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writePage(relPath, html) {
  const out = path.join(OUT, relPath);
  ensureDir(path.dirname(out));
  fs.writeFileSync(out, html, "utf8");
}

function copyFile(relFrom, relTo) {
  const src = path.join(REPO_ROOT, relFrom);
  const dest = path.join(OUT, relTo);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function markdownToHtml(md, fromMdRel = null) {
  const renderer = new marked.Renderer();
  renderer.link = function (token) {
    const href = mdHrefToWeb(token.href, BASE, fromMdRel);
    const title = token.title ? ` title="${escapeHtml(token.title)}"` : "";
    const text = token.text ?? "";
    return `<a href="${escapeHtml(href)}"${title}>${text}</a>`;
  };
  marked.setOptions({ gfm: true, breaks: true });
  return marked.parse(md, { renderer });
}

function buildLogs() {
  const paths = discoverLogFiles();
  const records = paths.map(logRecordFromPath);
  const byRel = new Map(records.map((r) => [r.relPath, r]));
  return { records, byRel };
}

function inferLogTags(record, { regions, grapes }) {
  const regionIds = [];
  const grapeIds = [];
  const regionText = `${record.region} ${record.country}`.toLowerCase();
  for (const r of regions) {
    const terms = r.matchTerms ?? [r.label, r.id];
    if (terms.some((t) => regionText.includes(String(t).toLowerCase()))) {
      regionIds.push(r.id);
    }
  }
  for (const g of grapes) {
    const gNorm = g.label.replace(/・/g, "").toLowerCase();
    for (const grape of record.grapes) {
      const grapeNorm = grape.replace(/（[^）]*）/g, "").replace(/・/g, "").toLowerCase();
      if (g.id === "pinot-noir") {
        if (/ピノ|pinot/i.test(grape)) grapeIds.push(g.id);
      } else if (grapeNorm.includes(gNorm) || g.label.includes(grape)) {
        grapeIds.push(g.id);
      }
    }
  }
  return { regionIds: [...new Set(regionIds)], grapeIds: [...new Set(grapeIds)] };
}

function renderLogListItem(record, base, extraAttrs = "") {
  const thumb = renderPhotoListing(record, base);
  const thumbHtml = thumb ? `<span class="log-list__thumb-wrap">${thumb}</span>` : "";
  return `<li${extraAttrs}><a class="log-list__link" href="${url(base, record.webPath)}">${thumbHtml}<span class="log-list__body"><strong>${escapeHtml(record.wineName || record.displayTitle)}</strong><span class="log-list__date">${escapeHtml(record.drankOn || "")}${record.region ? ` · ${escapeHtml(record.region)}` : ""}</span></span></a></li>`;
}

function renderLogPage(record, base) {
  const fields = [
    ["飲んだ日", record.drankOn || "—"],
    ["生産者", record.producer || "—"],
    ["ヴィンテージ", record.vintage || "—"],
    ["国", record.country || "—"],
    ["地域", record.region || "—"],
    ["価格", record.price || "—"],
    ["また飲みたいか", record.drinkAgain || "—"],
  ];

  const dl = fields
    .map(
      ([label, val]) =>
        `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(val)}</dd></div>`
    )
    .join("");

  const grapeTags =
    record.grapes.length > 0
      ? record.grapes.map((g) => `<span class="tag">${escapeHtml(g)}</span>`).join("")
      : '<span class="tag">—</span>';

  const impression = record.impression
    ? `<div class="log-block"><h2>印象</h2><p>${escapeHtml(record.impression)}</p></div>`
    : `<div class="log-block"><h2>印象</h2><p class="text-muted">（未記入）</p></div>`;

  const memo = record.memo
    ? `<div class="log-block"><h2>メモ（原文）</h2><p>${escapeHtml(record.memo)}</p></div>`
    : "";

  const photo = renderPhotoDetail(record, base);

  const body = `
    <article class="log-sheet">
      <header class="log-sheet__head">
        <h1 class="log-sheet__title">${escapeHtml(record.wineName || record.displayTitle)}</h1>
        <p class="log-sheet__sub">${escapeHtml(record.producer || "生産者不明")}${record.drankOn ? ` · ${escapeHtml(record.drankOn)}` : ""}</p>
        <div class="tag-row" style="margin-top:0.75rem">${grapeTags}</div>
      </header>
      ${photo}
      <dl class="dl-grid">${dl}</dl>
      ${impression}
      ${memo}
    </article>`;

  return layout({
    base,
    title: record.wineName || record.displayTitle,
    description: record.impression || "テイスティング記録",
    body,
    bodyClass: "page-log",
  });
}

function renderHome({ records, regions, grapes }) {
  const browseCards = [
    ...regions.map(
      (r) => `
      <article class="card" data-browse-card data-kind="region" data-search="${escapeHtml(`${r.label} ${r.country}`)}">
        <h3 class="card__title">${escapeHtml(r.label)}</h3>
        <p class="card__meta">${escapeHtml(r.country)}</p>
        <a class="card__link" href="${url(BASE, r.webPath)}">地域インデックスを見る →</a>
      </article>`
    ),
    ...grapes.map(
      (g) => `
      <article class="card" data-browse-card data-kind="grape" data-search="${escapeHtml(g.label)}">
        <h3 class="card__title">${escapeHtml(g.label)}</h3>
        <p class="card__meta">品種</p>
        <a class="card__link" href="${url(BASE, g.webPath)}">品種インデックスを見る →</a>
      </article>`
    ),
  ].join("");

  const recent =
    records.length === 0
      ? emptyState({
          heading: "まだテイスティング記録がありません",
          message:
            "飲んだワインはリポジトリの logs/ に Markdown で追加すると、このサイトにも自動的に載ります。",
          hint:
            '雛形: <code>templates/wine-log.md</code> · 正本は常に Markdown です。',
        })
      : `<ul class="log-list">${records
          .slice()
          .sort((a, b) => (b.drankOn || "").localeCompare(a.drankOn || ""))
          .slice(0, 5)
          .map((r) => renderLogListItem(r, BASE))
          .join("")}</ul>`;

  const regionOptions = regions
    .map((r) => `<option value="${escapeHtml(r.id)}">${escapeHtml(r.label)}</option>`)
    .join("");
  const grapeOptions = grapes
    .map((g) => `<option value="${escapeHtml(g.id)}">${escapeHtml(g.label)}</option>`)
    .join("");

  const logItems =
    records.length === 0
      ? ""
      : `<ul class="log-list" style="margin-top:1rem">${records
          .map((r) => {
            const { regionIds, grapeIds } = inferLogTags(r, { regions, grapes });
            return renderLogListItem(
              r,
              BASE,
              ` data-log-item data-regions="${escapeHtml(regionIds.join(","))}" data-grapes="${escapeHtml(grapeIds.join(","))}"`
            );
          })
          .join("")}</ul>
        <p data-filter-empty class="browse-hint" hidden>条件に合う記録がありません。</p>`;

  const body = `
    <section class="hero">
      <p class="hero__eyebrow">Personal wine journal</p>
      <h1 class="hero__title">飲んだワインを、正直に残す。</h1>
      <p class="hero__lead">地域・品種から辿れる小さなジャーナルです。採点や架空のレビューは載せません。書いたことだけを公開します。</p>
    </section>
    <div class="stat-bar" aria-label="概要">
      <div class="stat"><div class="stat__value">${records.length}</div><div class="stat__label">記録</div></div>
      <div class="stat"><div class="stat__value">${regions.length}</div><div class="stat__label">地域インデックス</div></div>
      <div class="stat"><div class="stat__value">${grapes.length}</div><div class="stat__label">品種インデックス</div></div>
    </div>
    <section style="margin-bottom:2.5rem">
      <h2 class="page-title">最近の記録</h2>
      ${recent}
    </section>
    ${
      records.length > 0
        ? `<section data-log-filter style="margin-bottom:2.5rem">
      <h2 class="page-title">記録を絞り込む</h2>
      <div class="toolbar">
        <label>地域 <select data-filter-region><option value="">すべて</option>${regionOptions}</select></label>
        <label>品種 <select data-filter-grape><option value="">すべて</option>${grapeOptions}</select></label>
      </div>
      ${logItems}
    </section>`
        : ""
    }
    <section data-browse>
      <h2 class="page-title">地域・品種から探す</h2>
      <p class="browse-hint">キーワード検索とカテゴリでインデックスを絞り込めます。</p>
      <div class="toolbar">
        <label>検索 <input type="search" data-browse-search placeholder="例: ボルドー、ピノ" autocomplete="off"></label>
        <label>種別 <select data-browse-kind><option value="all">すべて</option><option value="region">地域</option><option value="grape">品種</option></select></label>
      </div>
      <div class="card-grid">${browseCards}</div>
      <p data-browse-empty class="browse-hint" hidden>一致するインデックスがありません。</p>
    </section>`;

  return layout({
    base: BASE,
    title: "",
    description: "個人用ワイン・テイスティング記録",
    body,
    bodyClass: "page-home",
  });
}

function renderIndexListing(title, intro, items, base, kind) {
  const cards = items
    .map(
      (item) => `
    <article class="card" data-browse-card data-kind="${kind}" data-search="${escapeHtml(`${item.label} ${item.country || ""}`)}">
      <h3 class="card__title">${escapeHtml(item.label)}</h3>
      <p class="card__meta">${escapeHtml(item.country || "品種")}</p>
      <a class="card__link" href="${url(base, item.webPath)}">開く →</a>
    </article>`
    )
    .join("");

  const body = `
    <h1 class="page-title">${escapeHtml(title)}</h1>
    <p class="page-intro">${escapeHtml(intro)}</p>
    <section data-browse>
      <div class="toolbar">
        <label>検索 <input type="search" data-browse-search placeholder="名前で検索" autocomplete="off"></label>
      </div>
      <div class="card-grid">${cards}</div>
      <p data-browse-empty class="browse-hint" hidden>一致する項目がありません。</p>
    </section>`;

  return layout({ base, title, description: intro, body });
}

function renderIndexDetail(meta, md, logLinks, base) {
  const prose = markdownToHtml(md, meta.mdPath);
  const linkRows =
    logLinks.length > 0
      ? `<ul class="log-list">${logLinks
          .filter((row) => row.log)
          .map((row) => renderLogListItem(row.log, base))
          .join("")}</ul>`
      : emptyState({
          heading: "このインデックスにリンクされた記録はまだありません",
          message: `logs/ に記録を追加し、この Markdown インデックスに行を足すと一覧に表示されます。`,
        });

  const body = `
    <h1 class="page-title">${escapeHtml(meta.label)}</h1>
    <p class="page-intro">${escapeHtml(meta.country ? `${meta.country} · 地域インデックス` : "品種インデックス")}</p>
    <section class="prose" style="margin-bottom:1.5rem">${prose}</section>
    <h2 class="page-title" style="font-size:1.25rem">記録一覧</h2>
    ${linkRows}`;

  return layout({
    base,
    title: meta.label,
    description: `${meta.label}のテイスティング記録`,
    body,
  });
}

function renderAbout(base) {
  const body = `
    <h1 class="page-title">About</h1>
    <div class="prose">
      <p>このサイトは <strong>keipon1004/wine</strong> リポジトリの Markdown から自動生成されています。</p>
      <ul>
        <li>正本は <code>logs/YYYY/*.md</code> のみです。</li>
        <li><code>indexes/</code> はリンク集で、地域・品種から記録へ辿ります。</li>
        <li>不明な項目は空のまま。推測や架空のテイスティングは載せません。</li>
      </ul>
      <p>main ブランチへ Markdown を push すると GitHub Actions がサイトを再ビルドします。</p>
    </div>`;
  return layout({ base, title: "About", body });
}

function main() {
  if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true, force: true });
  ensureDir(OUT);

  copyFile("site/assets/css/main.css", "assets/css/main.css");
  copyFile("site/assets/js/browse.js", "assets/js/browse.js");

  const { regions, grapes } = listIndexPages();
  const { records, byRel } = buildLogs();

  writePage("index.html", renderHome({ records, regions, grapes }));
  writePage("about.html", renderAbout(BASE));

  const indexesReadme = readIndexMarkdown("indexes/README.md");
  writePage(
    "indexes/index.html",
    layout({
      base: BASE,
      title: "インデックス",
      body: `<h1 class="page-title">インデックス</h1><section class="prose">${markdownToHtml(indexesReadme, "indexes/README.md")}</section>`,
    })
  );

  writePage(
    "regions/index.html",
    renderIndexListing(
      "地域インデックス",
      "国・産地ごとのリンク集です。記録の本文は logs/ にのみあります。",
      regions,
      BASE,
      "region"
    )
  );

  writePage(
    "grapes/index.html",
    renderIndexListing(
      "品種インデックス",
      "ブレンドは複数の品種ページから同じ記録へリンクできます。",
      grapes,
      BASE,
      "grape"
    )
  );

  for (const meta of regions) {
    const md = readIndexMarkdown(meta.mdPath);
    const links = parseIndexLogLinks(md, byRel);
    writePage(meta.webPath, renderIndexDetail(meta, md, links, BASE));
  }

  for (const meta of grapes) {
    const md = readIndexMarkdown(meta.mdPath);
    const links = parseIndexLogLinks(md, byRel);
    writePage(meta.webPath, renderIndexDetail(meta, md, links, BASE));
  }

  copyLogPhotosToDist(records, OUT);

  for (const record of records) {
    writePage(record.webPath, renderLogPage(record, BASE));
  }

  const logsIndexBody =
    records.length === 0
      ? emptyState({
          heading: "記録はまだありません",
          message:
            "templates/wine-log.md をコピーして logs/ に保存すると、次回のデプロイでここに一覧されます。",
        })
      : `<ul class="log-list">${records.map((r) => renderLogListItem(r, BASE)).join("")}</ul>`;

  writePage(
    "logs/index.html",
    layout({
      base: BASE,
      title: "記録一覧",
      body: `<h1 class="page-title">記録一覧</h1>${logsIndexBody}`,
    })
  );

  fs.writeFileSync(
    path.join(OUT, "site-meta.json"),
    JSON.stringify({ basePath: BASE, logCount: records.length, builtAt: new Date().toISOString() }, null, 2)
  );

  console.log(`Built site → dist/ (${records.length} logs, base=${BASE})`);
}

main();
