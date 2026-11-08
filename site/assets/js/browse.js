(function () {
  function normalize(s) {
    return (s || "").toLowerCase().trim();
  }

  function initBrowse(root) {
    const search = root.querySelector("[data-browse-search]");
    const kind = root.querySelector("[data-browse-kind]");
    const cards = Array.from(root.querySelectorAll("[data-browse-card]"));
    const empty = root.querySelector("[data-browse-empty]");
    if (!cards.length) return;

    function apply() {
      const q = normalize(search?.value);
      const k = kind?.value || "all";
      let visible = 0;
      for (const card of cards) {
        const text = normalize(card.getAttribute("data-search"));
        const cardKind = card.getAttribute("data-kind");
        const matchQ = !q || text.includes(q);
        const matchK = k === "all" || cardKind === k;
        const show = matchQ && matchK;
        card.classList.toggle("is-hidden", !show);
        if (show) visible++;
      }
      if (empty) {
        empty.hidden = visible > 0;
      }
    }

    search?.addEventListener("input", apply);
    kind?.addEventListener("change", apply);
    apply();
  }

  document.querySelectorAll("[data-browse]").forEach(initBrowse);

  function initLogFilter(root) {
    const region = root.querySelector("[data-filter-region]");
    const grape = root.querySelector("[data-filter-grape]");
    const items = Array.from(root.querySelectorAll("[data-log-item]"));
    const empty = root.querySelector("[data-filter-empty]");
    if (!items.length) return;

    function apply() {
      const r = region?.value || "";
      const g = grape?.value || "";
      let visible = 0;
      for (const el of items) {
        const regions = (el.getAttribute("data-regions") || "").split(",");
        const grapes = (el.getAttribute("data-grapes") || "").split(",");
        const matchR = !r || regions.includes(r);
        const matchG = !g || grapes.includes(g);
        const show = matchR && matchG;
        el.hidden = !show;
        if (show) visible++;
      }
      if (empty) empty.hidden = visible > 0;
    }

    region?.addEventListener("change", apply);
    grape?.addEventListener("change", apply);
    apply();
  }

  document.querySelectorAll("[data-log-filter]").forEach(initLogFilter);
})();
