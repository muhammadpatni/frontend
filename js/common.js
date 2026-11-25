/* ===== LogiRoute shared helpers ===== */

const STORAGE_KEY = "logiroute.shipmentInput";

/* Data access layer: swap these bodies for fetch() calls to the ASP.NET Core API later. */
const clone = (x) => JSON.parse(JSON.stringify(x));
const api = {
  getCompanies:  async () => clone(COMPANIES),
  getProducts:   async () => clone(PRODUCTS),
  getContainers: async () => clone(CONTAINERS),
  getWarehouses: async () => clone(WAREHOUSES)
};

/* sessionStorage */
function saveShipmentInput(data) { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function loadShipmentInput() {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)); } catch (e) { return null; }
}

/* Formatting */
const fmtMoney = (n) => "$" + Number(n).toLocaleString("en-US");
const fmtKg = (n) => Number(n).toLocaleString("en-US") + " kg";
const fmtM3 = (n) => Number(Number(n).toFixed(2)).toLocaleString("en-US") + " m³";
function esc(v) {
  return String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function byId(list) { const m = new Map(); list.forEach((i) => m.set(i.id, i)); return m; }

/* ---------- SVG icon system (24px grid, 1.75 stroke, rounded) ---------- */
const ICONS = {
  truck: '<path d="M3 6.5h11v10H3z"/><path d="M14 9.5h4l3 3v4h-7"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>',
  container: '<rect x="2.5" y="6" width="19" height="12" rx="1"/><path d="M7.2 6v12M12 6v12M16.8 6v12"/>',
  box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  warehouse: '<path d="M3 9.5L12 4l9 5.5V20H3z"/><path d="M8 20v-6h8v6M8 17h8"/>',
  building: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-4h4v4"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
  weight: '<path d="M6.5 9h11l2.5 11H4z"/><circle cx="12" cy="5.5" r="2.5"/>',
  cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  alert: '<path d="M12 4l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h12l-2.5 4 2.5 4H5"/>',
  dollar: '<path d="M12 3.5v17"/><path d="M16.5 8c0-1.5-2-2.6-4.5-2.6S7.5 6.5 7.5 8.2s2 2.4 4.5 2.9 4.5 1.3 4.5 3-2 2.9-4.5 2.9S7.5 16.5 7.5 15"/>'
};

function icon(name, cls) {
  return `<svg class="icon ${cls || ""}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;
}
function injectIcons() {
  if (document.getElementById("icon-sprite")) return;
  const symbols = Object.entries(ICONS).map(([n, p]) => `<symbol id="i-${n}" viewBox="0 0 24 24">${p}</symbol>`).join("");
  document.body.insertAdjacentHTML("afterbegin",
    `<svg id="icon-sprite" width="0" height="0" style="position:absolute" aria-hidden="true">${symbols}</svg>`);
}
const metaItem = (name, text) => `<span class="meta-item">${icon(name)}${esc(text)}</span>`;

/* ---------- Header with three-step navigation ---------- */
function renderHeader(activeStep) {
  injectIcons();
  const steps = [
    { n: 1, label: "Shipment Input", href: "index.html" },
    { n: 2, label: "Processing", href: "processing.html" },
    { n: 3, label: "Output", href: "output.html" }
  ];
  const host = document.getElementById("app-header");
  host.className = "app-header";
  host.innerHTML = `
    <div class="app-header-inner">
      <a class="brand" href="index.html" aria-label="LogiRoute home">
        <span class="brand-mark">${icon("route")}</span>LogiRoute
      </a>
      <nav aria-label="Workflow">
        <ol class="steps">
          ${steps.map((s) => `<li><a href="${s.href}" ${s.n === activeStep ? 'aria-current="page"' : ""}>
            <span class="step-no">${s.n}</span><span>${s.label}</span></a></li>`).join("")}
        </ol>
      </nav>
    </div>`;
}

/* ---------- Searchable multi-select with removable tags inside the field ----------
   Options: root, placeholder, leadIcon, items (all known items, used to resolve tags),
   getText(item) -> searchable text, optionHtml(item), tagLabel(item), tagTitle(item),
   emptyText, onChange(ids).
   Returns { getSelected, setSelected, setOptions, remove }. */
function createTagSelect(cfg) {
  const lookup = byId(cfg.items);
  const selected = new Set();
  let options = cfg.items.slice();
  let query = "";
  let active = -1;
  let visible = [];
  const uid = "ts-" + Math.random().toString(36).slice(2, 8);

  cfg.root.classList.add("ts");
  cfg.root.innerHTML = `
    <div class="ts-control">
      <span class="ts-lead">${icon(cfg.leadIcon || "search")}</span>
      <div class="ts-field"><span class="ts-tag-list"></span>
        <input class="ts-input" type="text" role="combobox" aria-expanded="false" aria-controls="${uid}" aria-autocomplete="list" autocomplete="off" spellcheck="false">
      </div>
      <button type="button" class="ts-toggle" tabindex="-1" aria-label="Show options">${icon("chevron")}</button>
    </div>
    <div class="ts-menu" hidden>
      <div class="ts-tools"><span class="ts-count"></span>
        <span class="ts-tools-btns"><button type="button" data-act="all">Select all shown</button><button type="button" data-act="clear">Clear all</button></span>
      </div>
      <ul class="ts-list" id="${uid}" role="listbox" aria-multiselectable="true"></ul>
    </div>`;

  const q = (s) => cfg.root.querySelector(s);
  const control = q(".ts-control"), tagList = q(".ts-tag-list"), input = q(".ts-input");
  const menu = q(".ts-menu"), list = q(".ts-list"), countEl = q(".ts-count");

  const isOpen = () => !menu.hidden;
  function open() {
    if (isOpen()) return;
    menu.hidden = false; cfg.root.classList.add("is-open"); input.setAttribute("aria-expanded", "true");
    renderList();
  }
  function close() {
    menu.hidden = true; cfg.root.classList.remove("is-open"); input.setAttribute("aria-expanded", "false");
    active = -1; query = ""; input.value = "";
  }

  function renderTags() {
    tagList.innerHTML = Array.from(selected).map((id) => {
      const item = lookup.get(id);
      if (!item) return "";
      return `<span class="ts-tag" title="${esc(cfg.tagTitle ? cfg.tagTitle(item) : cfg.tagLabel(item))}">
        <span class="ts-tag-text">${esc(cfg.tagLabel(item))}</span>
        <button type="button" class="ts-tag-x" data-id="${esc(id)}" aria-label="Remove ${esc(cfg.tagLabel(item))}">${icon("x", "icon-sm")}</button></span>`;
    }).join("");
    input.placeholder = selected.size ? "" : cfg.placeholder;
  }

  function filtered() {
    const term = query.trim().toLowerCase();
    return term ? options.filter((o) => cfg.getText(o).toLowerCase().includes(term)) : options;
  }

  function renderList() {
    visible = filtered();
    if (active >= visible.length) active = visible.length - 1;
    countEl.textContent = `${visible.length} available`;
    list.innerHTML = visible.length
      ? visible.map((o, i) => `<li class="ts-option ${selected.has(o.id) ? "is-selected" : ""} ${i === active ? "is-active" : ""}"
          role="option" aria-selected="${selected.has(o.id)}" data-id="${esc(o.id)}">
          ${cfg.optionHtml(o)}<span class="ts-check">${icon("check")}</span></li>`).join("")
      : `<li class="ts-empty">${esc(query ? "No results match your search." : (cfg.emptyText || "Nothing available."))}</li>`;
  }

  function notify() { renderTags(); renderList(); if (cfg.onChange) cfg.onChange(Array.from(selected)); }

  function toggleItem(id) {
    if (selected.has(id)) selected.delete(id); else selected.add(id);
    query = ""; input.value = "";
    notify();
  }

  /* events */
  control.addEventListener("mousedown", (e) => {
    if (e.target.closest(".ts-tag-x")) return;
    if (e.target.closest(".ts-toggle")) { e.preventDefault(); isOpen() ? close() : (input.focus(), open()); return; }
    if (e.target !== input) e.preventDefault();
    input.focus(); open();
  });
  tagList.addEventListener("click", (e) => {
    const btn = e.target.closest(".ts-tag-x");
    if (btn) { selected.delete(btn.dataset.id); notify(); input.focus(); }
  });
  input.addEventListener("input", () => { query = input.value; active = visible.length ? 0 : -1; open(); renderList(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); open();
      const n = visible.length; if (!n) return;
      active = e.key === "ArrowDown" ? (active + 1) % n : (active - 1 + n) % n;
      renderList();
      const el = list.children[active]; if (el) el.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen() && visible[active]) toggleItem(visible[active].id);
    } else if (e.key === "Escape") {
      close();
    } else if (e.key === "Backspace" && !input.value && selected.size) {
      selected.delete(Array.from(selected).pop()); notify();
    }
  });
  list.addEventListener("mousedown", (e) => e.preventDefault()); /* keep focus in the input */
  list.addEventListener("click", (e) => {
    const li = e.target.closest(".ts-option");
    if (li) toggleItem(li.dataset.id);
  });
  list.addEventListener("mousemove", (e) => {
    const li = e.target.closest(".ts-option");
    if (!li) return;
    const idx = visible.findIndex((o) => o.id === li.dataset.id);
    if (idx !== active) { active = idx; list.querySelectorAll(".ts-option").forEach((el, i) => el.classList.toggle("is-active", i === idx)); }
  });
  menu.querySelector(".ts-tools").addEventListener("mousedown", (e) => e.preventDefault());
  menu.querySelector(".ts-tools").addEventListener("click", (e) => {
    const act = e.target.closest("button");
    if (!act) return;
    if (act.dataset.act === "all") visible.forEach((o) => selected.add(o.id));
    else selected.clear();
    notify();
  });
  cfg.root.addEventListener("focusout", (e) => { if (!cfg.root.contains(e.relatedTarget)) close(); });

  renderTags();
  return {
    getSelected: () => Array.from(selected),
    setSelected: (ids) => { selected.clear(); ids.forEach((id) => lookup.has(id) && selected.add(id)); renderTags(); if (isOpen()) renderList(); },
    setOptions: (list2) => { options = list2.slice(); active = -1; if (isOpen()) renderList(); },
    remove: (id) => { selected.delete(id); notify(); }
  };
}
