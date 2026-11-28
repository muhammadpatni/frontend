/* ===================== LogiRoute – script.js (API version) ===================== */

/* ---------- API ---------- */
const base_url = "http://localhost:5227/Datasouce";

async function GetData(params) {
  try {
    const response = await fetch(base_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.Error || result.Message || `HTTP Error: ${response.status}`);
    }
    return result; // Direct array of objects
  } catch (error) {
    console.error("GetData Error:", error.message);
    throw error;
  }
}

/* ---------- Page routes (ready for future backend/page integration) ---------- */
const PAGES = {
  "input-shipment": { label: "Input Shipment",  url: "index.html", ready: true  },
  "processing":     { label: "Processing",      url: null,         ready: false },
  "shipment-output":{ label: "Shipment Output", url: null,         ready: false }
};

/* ---------- Section 1: Header & Navigation ---------- */
const Navigation = (() => {
  const navButtons = () => document.querySelectorAll(".main-nav .nav-btn");

  function setActive(pageKey) {
    navButtons().forEach((btn) => {
      const isActive = btn.dataset.page === pageKey;
      btn.classList.toggle("is-active", isActive);
      if (isActive) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
  }

  function handleClick(event) {
    const btn = event.currentTarget;
    const page = PAGES[btn.dataset.page];
    if (!page || !page.ready) event.preventDefault();
  }

  function init() {
    navButtons().forEach((btn) => btn.addEventListener("click", handleClick));
    setActive("input-shipment");
  }

  return { init, setActive };
})();

/* ===================== Data (filled from the API) ===================== */
/* These arrays/objects are filled IN PLACE after the API call, so every
   section keeps working with the same references. */
const CONTAINERS = [];   // { id, type, weightCapacityKg, volumeCapacityM3 }
const WAREHOUSES = [];   // { id, name, maxWeightKg, maxVolumeM3 }
const COMPANIES  = [];   // { id, name }
const PRODUCTS   = [];   // { id, companyId, name, weightKg, volumeM3, price }

const COMPANY_BY_ID = {};
const PRODUCT_BY_ID = {};

const CURRENCY = "Rs";

/* ---------- API tables ---------- */
const TABLES = {
  containers: "Containers",
  warehouses: "Warehouses",
  products:   "Products",
  companies:  "Companies"
};

/* ---------- Key mapping (API keys -> keys used by the UI) ---------- */
const pick = (row, ...keys) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  return undefined;
};
const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const asRows = (result) => (Array.isArray(result) ? result : (result && (result.data || result.Data)) || []);

const mapContainer = (r) => ({
  id: String(pick(r, "ContainerID", "ContainerId")),
  type: pick(r, "ContainerName") ?? "Container",
  weightCapacityKg: num(pick(r, "MaxWeight")),
  volumeCapacityM3: num(pick(r, "MaxVolume"))
});

const mapWarehouse = (r) => ({
  id: String(pick(r, "WarehouseID", "WarehouseId")),
  name: pick(r, "WarehouseName") ?? "Warehouse",
  maxWeightKg: num(pick(r, "MaxWeight")),
  maxVolumeM3: num(pick(r, "MaxVolume"))
});

const mapProduct = (r) => ({
  id: String(pick(r, "ProductID", "ProductId")),
  companyId: String(pick(r, "CompanyID", "CompanyId")),
  name: pick(r, "ProductName") ?? "Product",
  weightKg: num(pick(r, "Weight")),
  volumeM3: num(pick(r, "Volume")),
  price: num(pick(r, "Price"))
});

/* Companies keys not final yet: CompanyID + CompanyName expected */
const mapCompany = (r) => {
  const id = String(pick(r, "CompanyID", "CompanyId", "ID"));
  return { id, name: pick(r, "CompanyName", "Name") ?? `Company ${id}` };
};

async function fetchAllData() {
  const [containers, warehouses, products, companies] = await Promise.all(
    [TABLES.containers, TABLES.warehouses, TABLES.products, TABLES.companies]
      .map((tablename) => GetData({ tablename, Whereclause: "" }))
  );

  CONTAINERS.length = 0; CONTAINERS.push(...asRows(containers).map(mapContainer));
  WAREHOUSES.length = 0; WAREHOUSES.push(...asRows(warehouses).map(mapWarehouse));
  COMPANIES.length  = 0; COMPANIES.push(...asRows(companies).map(mapCompany));
  PRODUCTS.length   = 0; PRODUCTS.push(...asRows(products).map(mapProduct));

  Object.keys(COMPANY_BY_ID).forEach((k) => delete COMPANY_BY_ID[k]);
  Object.keys(PRODUCT_BY_ID).forEach((k) => delete PRODUCT_BY_ID[k]);
  COMPANIES.forEach((c) => { COMPANY_BY_ID[c.id] = c; });
  PRODUCTS.forEach((p) => { PRODUCT_BY_ID[p.id] = p; });
}

const companyOf = (companyId) => COMPANY_BY_ID[companyId] || { id: companyId, name: "Unknown company" };

/* ===================== Section 2: Container & Warehouse Selection ===================== */

/* ---------- Icons (inline SVG, no emoji) ---------- */
const ICONS = {
  container: '<rect x="2.5" y="6" width="19" height="12" rx="1"/><path d="M6.5 6v12M10.5 6v12M14.5 6v12M18.5 6v12"/>',
  warehouse: '<path d="M3 10l9-6 9 6v10H3z"/><path d="M8 20v-6h8v6M8 17h8"/>',
  weight:    '<path d="M6 8h12l2 12H4L6 8z"/><circle cx="12" cy="5.5" r="2.5"/>',
  volume:    '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  location:  '<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  check:     '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  close:     '<path d="M6 6l12 12M18 6L6 18"/>',
  chevron:   '<path d="M6 9l6 6 6-6"/>'
};

const icon = (name) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

const formatNumber = (value) =>
  Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
const formatWeight = (value) =>
  Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
const formatVolume = (value) =>
  Number(value).toLocaleString("en-US", { maximumFractionDigits: 3 });
const formatMoney = (value) => `${CURRENCY} ${formatNumber(value)}`;
const round2 = (value) => Math.round(value * 100) / 100;
const round3 = (value) => Math.round(value * 1000) / 1000;

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

/* ---------- Reusable searchable multi-select dropdown with removable tags ---------- */
function createMultiSelect(config) {
  const { rootId, type, label, labelIcon, itemIcon, placeholder, noun, items,
          getTitle, getStats, getSearchText } = config;

  const selectedIds = new Set();   // insertion order = order of the tags
  let visible = [];
  let activeIndex = -1;
  let isOpen = false;
  let root, control, input, chipsEl, menu, optionsEl, countEl;

  const byId = (id) => items.find((item) => item.id === id);
  const getSelected = () => items.filter((item) => selectedIds.has(item.id));

  function getVisible() {
    const query = input.value.trim().toLowerCase();
    return query
      ? items.filter((item) => getSearchText(item).toLowerCase().includes(query))
      : items.slice();
  }

  function notify() {
    document.dispatchEvent(new CustomEvent("selection:change", {
      detail: { type, selected: getSelected() }
    }));
  }

  function renderChips() {
    chipsEl.innerHTML = [...selectedIds].map((id) => {
      const title = escapeHtml(getTitle(byId(id)));
      return `<span class="ms__chip">
        <span class="ms__chip-label">${title}</span>
        <button type="button" class="ms__chip-remove" data-id="${escapeHtml(id)}" aria-label="Remove ${title}">${icon("close")}</button>
      </span>`;
    }).join("");
    input.placeholder = selectedIds.size ? "" : placeholder;
  }

  function renderOptions() {
    visible = getVisible();
    if (activeIndex >= visible.length) activeIndex = visible.length - 1;
    countEl.textContent = `${visible.length} available`;

    optionsEl.innerHTML = visible.length
      ? visible.map((item, index) => {
          const selected = selectedIds.has(item.id);
          const stats = getStats(item)
            .map((stat) => `<span class="ms__stat">${icon(stat.icon)}${escapeHtml(stat.text)}</span>`)
            .join("");
          return `<li class="ms__option${selected ? " is-selected" : ""}${index === activeIndex ? " is-active" : ""}"
                      role="option" id="${rootId}-opt-${index}" data-id="${escapeHtml(item.id)}" aria-selected="${selected}">
            <span class="ms__option-icon">${icon(itemIcon)}</span>
            <span class="ms__option-main">
              <span class="ms__option-title">${escapeHtml(getTitle(item))}<span class="ms__option-id">#${escapeHtml(item.id)}</span></span>
              <span class="ms__option-stats">${stats}</span>
            </span>
            <span class="ms__option-check">${icon("check")}</span>
          </li>`;
        }).join("")
      : `<li class="ms__empty">No ${noun} match your search.</li>`;

    if (activeIndex >= 0) {
      input.setAttribute("aria-activedescendant", `${rootId}-opt-${activeIndex}`);
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function refresh() {
    renderChips();
    renderOptions();
    notify();
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    menu.hidden = false;
    root.classList.add("is-open");
    input.setAttribute("aria-expanded", "true");
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    menu.hidden = true;
    root.classList.remove("is-open");
    input.setAttribute("aria-expanded", "false");
    input.value = "";
    activeIndex = -1;
    renderOptions();
  }

  function toggle(id) {
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    refresh();
  }

  function moveActive(step) {
    if (!visible.length) return;
    if (activeIndex < 0) {
      activeIndex = step > 0 ? 0 : visible.length - 1;
    } else {
      activeIndex = (activeIndex + step + visible.length) % visible.length;
    }
    renderOptions();
    const activeEl = optionsEl.querySelector(".is-active");
    if (activeEl) activeEl.scrollIntoView({ block: "nearest" });
  }

  function handleKeydown(event) {
    switch (event.key) {
      case "ArrowDown": event.preventDefault(); open(); moveActive(1); break;
      case "ArrowUp":   event.preventDefault(); open(); moveActive(-1); break;
      case "Enter":
        if (isOpen && activeIndex >= 0 && visible[activeIndex]) {
          event.preventDefault();
          toggle(visible[activeIndex].id);
        }
        break;
      case "Escape": close(); break;
      case "Tab": close(); break;
      case "Backspace":
        if (!input.value && selectedIds.size) {
          selectedIds.delete([...selectedIds].pop());
          refresh();
        }
        break;
    }
  }

  function init() {
    root = document.getElementById(rootId);
    if (!root) return;

    root.innerHTML = `
      <label class="ms__label" for="${rootId}-input">${icon(labelIcon)}<span>${escapeHtml(label)}</span></label>
      <div class="ms__control">
        <div class="ms__tags">
          <span class="ms__chips"></span>
          <input id="${rootId}-input" class="ms__input" type="text" role="combobox" autocomplete="off"
                 aria-expanded="false" aria-controls="${rootId}-menu" aria-autocomplete="list"
                 placeholder="${escapeHtml(placeholder)}">
        </div>
        <button type="button" class="ms__toggle" tabindex="-1" aria-label="Show ${escapeHtml(noun)} list">${icon("chevron")}</button>
      </div>
      <div class="ms__menu" id="${rootId}-menu" hidden>
        <div class="ms__menu-bar">
          <span class="ms__count"></span>
          <span class="ms__actions">
            <button type="button" class="ms__action" data-action="select-all">Select all shown</button>
            <button type="button" class="ms__action" data-action="clear">Clear all</button>
          </span>
        </div>
        <ul class="ms__options" role="listbox" aria-multiselectable="true" aria-label="${escapeHtml(label)}"></ul>
      </div>`;

    control   = root.querySelector(".ms__control");
    input     = root.querySelector(".ms__input");
    chipsEl   = root.querySelector(".ms__chips");
    menu      = root.querySelector(".ms__menu");
    optionsEl = root.querySelector(".ms__options");
    countEl   = root.querySelector(".ms__count");

    control.addEventListener("click", (event) => {
      const removeBtn = event.target.closest(".ms__chip-remove");
      if (removeBtn) {
        selectedIds.delete(removeBtn.dataset.id);
        refresh();
        input.focus();
        return;
      }
      if (event.target.closest(".ms__toggle") && isOpen) {
        close();
        return;
      }
      open();
      input.focus();
    });

    input.addEventListener("input", () => {
      open();
      activeIndex = 0;
      renderOptions();
    });
    input.addEventListener("keydown", handleKeydown);

    menu.addEventListener("click", (event) => {
      const option = event.target.closest(".ms__option");
      if (option) {
        toggle(option.dataset.id);
        input.focus();
        return;
      }
      const action = event.target.closest(".ms__action");
      if (!action) return;
      if (action.dataset.action === "select-all") {
        getVisible().forEach((item) => selectedIds.add(item.id));
      } else {
        selectedIds.clear();
      }
      refresh();
      input.focus();
    });

    document.addEventListener("click", (event) => {
      if (!event.composedPath().includes(root)) close();
    });

    renderChips();
    renderOptions();
  }

  return { init, getSelected };
}

const SelectionSection = (() => {
  const containerSelect = createMultiSelect({
    rootId: "container-select",
    type: "containers",
    label: "Container Selection",
    labelIcon: "container",
    itemIcon: "container",
    placeholder: "Search and select containers",
    noun: "containers",
    items: CONTAINERS,
    getTitle: (c) => c.type,
    getSearchText: (c) => `${c.type} ${c.id}`,
    getStats: (c) => [
      { icon: "weight", text: `Max ${formatWeight(c.weightCapacityKg)} kg` },
      { icon: "volume", text: `Max ${formatVolume(c.volumeCapacityM3)} m\u00B3` }
    ]
  });

  const warehouseSelect = createMultiSelect({
    rootId: "warehouse-select",
    type: "warehouses",
    label: "Warehouse Selection",
    labelIcon: "warehouse",
    itemIcon: "warehouse",
    placeholder: "Search and select warehouses",
    noun: "warehouses",
    items: WAREHOUSES,
    getTitle: (w) => w.name,
    getSearchText: (w) => `${w.name} ${w.id}`,
    getStats: (w) => [
      { icon: "weight", text: `Max ${formatWeight(w.maxWeightKg)} kg` },
      { icon: "volume", text: `Max ${formatVolume(w.maxVolumeM3)} m\u00B3` }
    ]
  });

  return {
    init() { containerSelect.init(); warehouseSelect.init(); },
    getSelectedContainers: containerSelect.getSelected,
    getSelectedWarehouses: warehouseSelect.getSelected
  };
})();

/* ===================== Section 3: Product Selection Grid ===================== */

Object.assign(ICONS, {
  box:      '<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  boxCheck: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="M8.5 12.5l2.5 2.5 4.5-4.5"/>',
  company:  '<path d="M4 21V5l8-2v18"/><path d="M12 9l8 2v10"/><path d="M8 8h.01M8 12h.01M8 16h.01"/>',
  price:    '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.2"/>'
});

/* ---------- Searchable single-select dropdown (company filter) ---------- */
function createCompanySelect(config) {
  const { rootId, items, onChange } = config;

  let selectedId = null;            // null = all companies
  let visible = [];
  let activeIndex = -1;
  let isOpen = false;
  let root, control, input, chipsEl, menu, optionsEl, countEl;

  const placeholder = "Search companies (all shown)";

  function getVisible() {
    const query = input.value.trim().toLowerCase();
    return query
      ? items.filter((c) => `${c.name} ${c.id}`.toLowerCase().includes(query))
      : items.slice();
  }

  function renderChips() {
    const company = selectedId ? COMPANY_BY_ID[selectedId] : null;
    chipsEl.innerHTML = company
      ? `<span class="ms__chip">
           <span class="ms__chip-label">${escapeHtml(company.name)}</span>
           <button type="button" class="ms__chip-remove" aria-label="Show all companies">${icon("close")}</button>
         </span>`
      : "";
    input.placeholder = company ? "" : placeholder;
  }

  function renderOptions() {
    visible = getVisible();
    if (activeIndex >= visible.length) activeIndex = visible.length - 1;
    countEl.textContent = `${visible.length} companies`;

    optionsEl.innerHTML = visible.length
      ? visible.map((c, index) => {
          const selected = c.id === selectedId;
          const count = PRODUCTS.filter((p) => p.companyId === c.id).length;
          return `<li class="ms__option${selected ? " is-selected" : ""}${index === activeIndex ? " is-active" : ""}"
                      role="option" id="${rootId}-opt-${index}" data-id="${escapeHtml(c.id)}" aria-selected="${selected}">
            <span class="ms__option-icon">${icon("company")}</span>
            <span class="ms__option-main">
              <span class="ms__option-title">${escapeHtml(c.name)}<span class="ms__option-id">#${escapeHtml(c.id)}</span></span>
              <span class="ms__option-stats">
                <span class="ms__stat">${icon("box")}${count} products</span>
              </span>
            </span>
            <span class="ms__option-check">${icon("check")}</span>
          </li>`;
        }).join("")
      : `<li class="ms__empty">No companies match your search.</li>`;

    if (activeIndex >= 0) {
      input.setAttribute("aria-activedescendant", `${rootId}-opt-${activeIndex}`);
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    menu.hidden = false;
    root.classList.add("is-open");
    input.setAttribute("aria-expanded", "true");
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    menu.hidden = true;
    root.classList.remove("is-open");
    input.setAttribute("aria-expanded", "false");
    input.value = "";
    activeIndex = -1;
    renderOptions();
  }

  function setCompany(id) {
    selectedId = id;               // null clears the filter
    renderChips();
    close();
    renderOptions();
    onChange(selectedId);
  }

  function moveActive(step) {
    if (!visible.length) return;
    activeIndex = activeIndex < 0
      ? (step > 0 ? 0 : visible.length - 1)
      : (activeIndex + step + visible.length) % visible.length;
    renderOptions();
    const activeEl = optionsEl.querySelector(".is-active");
    if (activeEl) activeEl.scrollIntoView({ block: "nearest" });
  }

  function handleKeydown(event) {
    switch (event.key) {
      case "ArrowDown": event.preventDefault(); open(); moveActive(1); break;
      case "ArrowUp":   event.preventDefault(); open(); moveActive(-1); break;
      case "Enter":
        if (isOpen && activeIndex >= 0 && visible[activeIndex]) {
          event.preventDefault();
          const id = visible[activeIndex].id;
          setCompany(id === selectedId ? null : id);
        }
        break;
      case "Escape": close(); break;
      case "Tab": close(); break;
      case "Backspace":
        if (!input.value && selectedId) setCompany(null);
        break;
    }
  }

  function init() {
    root = document.getElementById(rootId);
    if (!root) return;

    root.innerHTML = `
      <label class="ms__label" for="${rootId}-input">${icon("company")}<span>Company Selection</span></label>
      <div class="ms__control">
        <div class="ms__tags">
          <span class="ms__chips"></span>
          <input id="${rootId}-input" class="ms__input" type="text" role="combobox" autocomplete="off"
                 aria-expanded="false" aria-controls="${rootId}-menu" aria-autocomplete="list"
                 placeholder="${placeholder}">
        </div>
        <button type="button" class="ms__toggle" tabindex="-1" aria-label="Show companies list">${icon("chevron")}</button>
      </div>
      <div class="ms__menu" id="${rootId}-menu" hidden>
        <div class="ms__menu-bar">
          <span class="ms__count"></span>
          <span class="ms__actions">
            <button type="button" class="ms__action" data-action="clear">Show all companies</button>
          </span>
        </div>
        <ul class="ms__options" role="listbox" aria-label="Company Selection"></ul>
      </div>`;

    control   = root.querySelector(".ms__control");
    input     = root.querySelector(".ms__input");
    chipsEl   = root.querySelector(".ms__chips");
    menu      = root.querySelector(".ms__menu");
    optionsEl = root.querySelector(".ms__options");
    countEl   = root.querySelector(".ms__count");

    control.addEventListener("click", (event) => {
      if (event.target.closest(".ms__chip-remove")) {
        setCompany(null);
        input.focus();
        return;
      }
      if (event.target.closest(".ms__toggle") && isOpen) {
        close();
        return;
      }
      open();
      input.focus();
    });

    input.addEventListener("input", () => {
      open();
      activeIndex = 0;
      renderOptions();
    });
    input.addEventListener("keydown", handleKeydown);

    menu.addEventListener("click", (event) => {
      const option = event.target.closest(".ms__option");
      if (option) {
        const id = option.dataset.id;
        setCompany(id === selectedId ? null : id);
        input.focus();
        return;
      }
      if (event.target.closest(".ms__action")) {
        setCompany(null);
        input.focus();
      }
    });

    document.addEventListener("click", (event) => {
      if (!event.composedPath().includes(root)) close();
    });

    renderChips();
    renderOptions();
  }

  return { init, getSelectedId: () => selectedId };
}

/* ---------- Section 3 module ---------- */
const ProductSection = (() => {
  // productId -> { mandatory: boolean }  (insertion order = selection order)
  const selection = new Map();
  let activeCompanyId = null;       // null = all companies
  let gridEl, metaEl, infoEl, footerEl, companySelect;

  const SUMMARY_ITEMS = [
    { key: "count",  label: "Total Selected Products", icon: "boxCheck" },
    { key: "weight", label: "Total Weight",            icon: "weight" },
    { key: "volume", label: "Total Volume",            icon: "volume" },
    { key: "value",  label: "Total Product Value",     icon: "price" }
  ];

  function getProductsByCompany(companyId) {
    return companyId ? PRODUCTS.filter((p) => p.companyId === companyId) : PRODUCTS.slice();
  }

  function isSelected(id) { return selection.has(id); }

  function getSelectedProducts() {
    return [...selection].map(([id, state]) => ({
      ...PRODUCT_BY_ID[id],
      companyName: companyOf(PRODUCT_BY_ID[id].companyId).name,
      mandatory: state.mandatory
    }));
  }

  function calculateTotals() {
    let weightKg = 0, volumeM3 = 0, value = 0;
    selection.forEach((_, id) => {
      const p = PRODUCT_BY_ID[id];
      weightKg += p.weightKg;
      volumeM3 += p.volumeM3;
      value += p.price;
    });
    return { count: selection.size, weightKg: round3(weightKg), volumeM3: round3(volumeM3), value: round2(value) };
  }

  function selectProduct(id) {
    if (!PRODUCT_BY_ID[id] || selection.has(id)) return;
    selection.set(id, { mandatory: false });
    afterChange(id);
  }

  function deselectProduct(id) {
    if (!selection.delete(id)) return;
    afterChange(id);
  }

  function toggleProduct(id) {
    if (selection.has(id)) deselectProduct(id); else selectProduct(id);
  }

  function setMandatory(id, value) {
    const state = selection.get(id);
    if (!state) return;
    state.mandatory = Boolean(value);
    afterChange(id);
  }

  function afterChange(id) {
    updateCard(id);
    renderSummary();
    renderCompanyInfo();
    document.dispatchEvent(new CustomEvent("products:change", {
      detail: { selected: getSelectedProducts(), totals: calculateTotals() }
    }));
  }

  function headHtml() {
    return `<div class="pt-head" role="row">
      <span></span>
      <span>Product</span>
      <span>Company</span>
      <span class="pt-num">Weight</span>
      <span class="pt-num">Volume</span>
      <span class="pt-num">Price</span>
      <span>Mandatory</span>
    </div>`;
  }

  function cardHtml(p) {
    const name = escapeHtml(p.name);
    const company = escapeHtml(companyOf(p.companyId).name);
    return `<article class="pcard" role="row" data-id="${escapeHtml(p.id)}">
      <span class="pcard__cell">
        <input type="checkbox" class="pcard__check" aria-label="Select ${name}">
      </span>
      <h3 class="pcard__name" title="${name}">
        <span class="pcard__name-text">${name}</span>
        <span class="pcard__badge" hidden>Mandatory</span>
      </h3>
      <span class="pcard__cell pcard__company" title="${company}">${icon("company")}<span>${company}</span></span>
      <span class="pcard__cell pcard__cell--num">${formatWeight(p.weightKg)} kg</span>
      <span class="pcard__cell pcard__cell--num">${formatVolume(p.volumeM3)} m\u00B3</span>
      <span class="pcard__cell pcard__price">${formatMoney(p.price)}</span>
      <span class="pcard__cell">
        <label class="pcard__mandatory">
          <input type="checkbox" role="switch" class="pcard__switch" aria-label="Mark ${name} as mandatory" disabled>
          <span class="pcard__mandatory-text">Mandatory</span>
        </label>
      </span>
    </article>`;
  }

  function applyCardState(card) {
    const entry = selection.get(card.dataset.id);
    const selected = Boolean(entry);
    const mandatory = selected && entry.mandatory;
    const toggle = card.querySelector(".pcard__switch");

    card.classList.toggle("is-selected", selected);
    card.classList.toggle("is-mandatory", mandatory);
    card.querySelector(".pcard__check").checked = selected;
    toggle.disabled = !selected;
    toggle.checked = mandatory;
    card.querySelector(".pcard__badge").hidden = !mandatory;
    card.querySelector(".pcard__mandatory").title = selected
      ? "Mark this product as mandatory"
      : "Select this product first to enable Mandatory";
  }

  function updateCard(id) {
    const card = gridEl.querySelector(`.pcard[data-id="${CSS.escape(id)}"]`);
    if (card) applyCardState(card);
  }

  function renderGrid() {
    const list = getProductsByCompany(activeCompanyId);
    gridEl.innerHTML = list.length
      ? headHtml() + list.map(cardHtml).join("")
      : `<p class="ps-empty">No products available${activeCompanyId ? " for this company" : ""}.</p>`;
    gridEl.querySelectorAll(".pcard").forEach((card) => applyCardState(card));
    gridEl.scrollTop = 0;
    metaEl.textContent = `Showing ${list.length} of ${PRODUCTS.length} products`;
  }

  function renderCompanyInfo() {
    const company = activeCompanyId ? COMPANY_BY_ID[activeCompanyId] : null;
    const list = getProductsByCompany(activeCompanyId);
    const selectedHere = list.filter((p) => selection.has(p.id)).length;
    const rows = [
      ["Showing", company ? company.name : "All companies", ""],
      ["Company ID", company ? `#${company.id}` : "All", ""],
      ["Products listed", list.length, ""],
      ["Selected here", selectedHere, " company-info__row--accent"]
    ];
    infoEl.innerHTML = rows.map(([label, value, extra]) =>
      `<div class="company-info__row${extra}"><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`
    ).join("");
  }

  function renderSummary() {
    const t = calculateTotals();
    const values = {
      count:  String(t.count),
      weight: `${formatWeight(t.weightKg)} kg`,
      volume: `${formatVolume(t.volumeM3)} m\u00B3`,
      value:  formatMoney(t.value)
    };
    footerEl.querySelectorAll("[data-total]").forEach((el) => {
      el.textContent = values[el.dataset.total];
    });
  }

  function onCompanyChange(companyId) {
    activeCompanyId = companyId;
    renderGrid();
    renderCompanyInfo();
  }

  function init() {
    gridEl   = document.getElementById("product-grid");
    metaEl   = document.getElementById("product-meta");
    infoEl   = document.getElementById("company-info");
    footerEl = document.getElementById("summary-footer");
    if (!gridEl || !footerEl) return;

    footerEl.innerHTML = SUMMARY_ITEMS.map((item) => `
      <div class="summary__item">
        <span class="summary__icon">${icon(item.icon)}</span>
        <span class="summary__text">
          <span class="summary__label">${item.label}</span>
          <span class="summary__value" data-total="${item.key}">0</span>
        </span>
      </div>`).join("");

    companySelect = createCompanySelect({
      rootId: "company-select",
      items: COMPANIES,
      onChange: onCompanyChange
    });
    companySelect.init();

    gridEl.addEventListener("click", (event) => {
      if (event.target.closest(".pcard__mandatory")) return;
      const card = event.target.closest(".pcard");
      if (card) toggleProduct(card.dataset.id);
    });

    gridEl.addEventListener("change", (event) => {
      const toggle = event.target.closest(".pcard__switch");
      if (toggle) setMandatory(toggle.closest(".pcard").dataset.id, toggle.checked);
    });

    renderGrid();
    renderCompanyInfo();
    renderSummary();
  }

  return {
    init,
    getSelectedProducts,
    calculateTotals,
    isSelected,
    selectProduct,
    deselectProduct,
    setMandatory
  };
})();

/* ===================== Section 4: Shipment Summary & Start Processing ===================== */

const SHIPMENT_STORAGE_KEY = "logiroute.shipment";   // read this key on the Processing page

Object.assign(ICONS, {
  alert:       '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v5M12 17.5h.01"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-5.5"/>'
});

const ShipmentSection = (() => {
  let gridEl, statusEl, btnEl, msgEl;

  function collect() {
    const containers = SelectionSection.getSelectedContainers();
    const warehouses = SelectionSection.getSelectedWarehouses();
    const products   = ProductSection.getSelectedProducts();
    const totals     = ProductSection.calculateTotals();

    const companyMap = new Map();
    products.forEach((p) => {
      const company = companyOf(p.companyId);
      const entry = companyMap.get(company.id) || { ...company, selectedProductCount: 0 };
      entry.selectedProductCount += 1;
      companyMap.set(company.id, entry);
    });

    return {
      containers,
      warehouses,
      products,
      companies: [...companyMap.values()],
      totals,
      mandatoryCount: products.filter((p) => p.mandatory).length,
      containerCapacity: {
        count: containers.length,
        weightKg: round3(containers.reduce((s, c) => s + c.weightCapacityKg, 0)),
        volumeM3: round3(containers.reduce((s, c) => s + c.volumeCapacityM3, 0))
      },
      warehouseCapacity: {
        count: warehouses.length,
        weightKg: round3(warehouses.reduce((s, w) => s + w.maxWeightKg, 0)),
        volumeM3: round3(warehouses.reduce((s, w) => s + w.maxVolumeM3, 0))
      }
    };
  }

  function blockHtml(b) {
    const stats = b.stats.map(([label, value]) =>
      `<div class="ss-stat"><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
    const chips = b.chips.length
      ? b.chips.map((c) =>
          `<span class="ss-chip${c.mandatory ? " ss-chip--mandatory" : ""}" title="${escapeHtml(c.title || c.text)}">${escapeHtml(c.text)}</span>`).join("")
      : `<span class="ss-empty">${b.empty}</span>`;
    return `<section class="ss-block">
      <header class="ss-block__head">
        <span class="ss-block__icon">${icon(b.icon)}</span>
        <h3 class="ss-block__title">${b.title}</h3>
        <span class="ss-count">${b.count}</span>
      </header>
      <dl class="ss-stats${b.twoCols ? " ss-stats--2" : ""}">${stats}</dl>
      <div class="ss-chips">${chips}</div>
    </section>`;
  }

  function render() {
    const d = collect();

    gridEl.innerHTML = [
      blockHtml({
        icon: "container", title: "Containers", count: d.containers.length, empty: "No container selected",
        stats: [
          ["Weight capacity", `${formatWeight(d.containerCapacity.weightKg)} kg`],
          ["Volume capacity", `${formatVolume(d.containerCapacity.volumeM3)} m\u00B3`]
        ],
        chips: d.containers.map((c) => ({ text: `#${c.id} \u00B7 ${c.type}` }))
      }),
      blockHtml({
        icon: "warehouse", title: "Warehouses", count: d.warehouses.length, empty: "No warehouse selected",
        stats: [
          ["Max weight", `${formatWeight(d.warehouseCapacity.weightKg)} kg`],
          ["Max volume", `${formatVolume(d.warehouseCapacity.volumeM3)} m\u00B3`]
        ],
        chips: d.warehouses.map((w) => ({
          text: w.name,
          title: `#${w.id} \u00B7 ${w.name} \u00B7 ${formatWeight(w.maxWeightKg)} kg \u00B7 ${formatVolume(w.maxVolumeM3)} m\u00B3`
        }))
      }),
      blockHtml({
        icon: "company", title: "Companies", count: d.companies.length, empty: "No company yet",
        stats: [["Products", String(d.products.length)]],
        chips: d.companies.map((c) => ({
          text: c.name,
          title: `${c.name} \u00B7 ${c.selectedProductCount} selected`
        }))
      }),
      blockHtml({
        icon: "boxCheck", title: "Products", count: d.totals.count, empty: "No product selected", twoCols: true,
        stats: [
          ["Mandatory", String(d.mandatoryCount)],
          ["Weight", `${formatWeight(d.totals.weightKg)} kg`],
          ["Volume", `${formatVolume(d.totals.volumeM3)} m\u00B3`],
          ["Value",  formatMoney(d.totals.value)]
        ],
        chips: d.products.map((p) => ({
          text: p.name,
          mandatory: p.mandatory,
          title: `${p.name} (${p.companyName})${p.mandatory ? " \u2013 Mandatory" : ""}`
        }))
      })
    ].join("");

    const nothing = !d.containers.length && !d.warehouses.length && !d.products.length;
    statusEl.textContent = nothing
      ? "Nothing selected yet"
      : "Live from Container, Warehouse and Product selections";
  }

  function showMessage(type, title, lines) {
    msgEl.dataset.type = type;
    msgEl.innerHTML = `<strong class="shipment-msg__title">${icon(type === "ok" ? "checkCircle" : "alert")}<span>${escapeHtml(title)}</span></strong>
      <ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;
    msgEl.hidden = false;
  }

  function clearMessage() {
    msgEl.hidden = true;
    msgEl.innerHTML = "";
  }

  function validate(d) {
    const missing = [];
    if (!d.containers.length) missing.push("No container selected. Select at least one container.");
    if (!d.warehouses.length) missing.push("No warehouse selected. Select at least one warehouse.");
    if (!d.products.length)   missing.push("No product selected. Select at least one product.");

    const capacity = [];
    if (d.containers.length && d.products.length) {
      const overW = round3(d.totals.weightKg - d.containerCapacity.weightKg);
      const overV = round3(d.totals.volumeM3 - d.containerCapacity.volumeM3);
      if (overW > 0) {
        capacity.push(`Weight exceeds container capacity by ${formatWeight(overW)} kg `
          + `(products ${formatWeight(d.totals.weightKg)} kg, containers ${formatWeight(d.containerCapacity.weightKg)} kg).`);
      }
      if (overV > 0) {
        capacity.push(`Volume exceeds container capacity by ${formatVolume(overV)} m\u00B3 `
          + `(products ${formatVolume(d.totals.volumeM3)} m\u00B3, containers ${formatVolume(d.containerCapacity.volumeM3)} m\u00B3).`);
      }
    }

    if (missing.length) {
      return { ok: false, type: "error", title: "Cannot start processing", messages: missing.concat(capacity) };
    }
    if (capacity.length) {
      return {
        ok: false, type: "warn", title: "Capacity exceeded",
        messages: capacity.concat("Add containers or deselect some products. Nothing was removed automatically.")
      };
    }
    return { ok: true };
  }

  function buildShipment(d) {
    return {
      id: `SHP-${Date.now()}`,
      createdAt: new Date().toISOString(),
      containers: d.containers.map((c) => ({ ...c })),
      warehouses: d.warehouses.map((w) => ({ ...w })),
      companies: d.companies,
      products: d.products,
      mandatoryProductIds: d.products.filter((p) => p.mandatory).map((p) => p.id),
      totals: {
        products: d.totals,
        mandatoryCount: d.mandatoryCount,
        containerCapacity: d.containerCapacity,
        warehouseCapacity: d.warehouseCapacity
      }
    };
  }

  function getShipment() { return buildShipment(collect()); }

  function loadStoredShipment() {
    try {
      return JSON.parse(sessionStorage.getItem(SHIPMENT_STORAGE_KEY));
    } catch (error) {
      return null;
    }
  }

  function start() {
    const d = collect();
    const result = validate(d);
    if (!result.ok) {
      showMessage(result.type, result.title, result.messages);
      return;
    }

    const shipment = buildShipment(d);
    try {
      sessionStorage.setItem(SHIPMENT_STORAGE_KEY, JSON.stringify(shipment));
    } catch (error) {
      showMessage("error", "Shipment data could not be saved",
        ["Browser storage is unavailable. Please check the browser settings and try again."]);
      return;
    }

    document.dispatchEvent(new CustomEvent("shipment:ready", { detail: shipment }));

    const page = PAGES["processing"];
    if (page && page.ready && page.url) {
      window.location.href = page.url;
      return;
    }
    showMessage("ok", "Shipment ready for processing", [
      `${d.containers.length} container(s), ${d.warehouses.length} warehouse(s), `
        + `${d.totals.count} product(s) (${d.mandatoryCount} mandatory).`,
      "Shipment data is saved. The Processing page is not available yet."
    ]);
  }

  function onSelectionChange() {
    clearMessage();
    render();
  }

  function init() {
    gridEl   = document.getElementById("ss-grid");
    statusEl = document.getElementById("ss-status");
    btnEl    = document.getElementById("start-btn");
    msgEl    = document.getElementById("shipment-msg");
    if (!gridEl || !btnEl) return;

    btnEl.addEventListener("click", start);
    document.addEventListener("selection:change", onSelectionChange);
    document.addEventListener("products:change", onSelectionChange);

    render();
  }

  return { init, getShipment, loadStoredShipment };
})();

/* ===================== App start: load API data, then init sections ===================== */
async function bootstrap() {
  const gridEl = document.getElementById("product-grid");
  const metaEl = document.getElementById("product-meta");

  gridEl.innerHTML = `<p class="ps-empty">Loading data from server...</p>`;
  metaEl.textContent = "";

  try {
    await fetchAllData();
  } catch (error) {
    gridEl.innerHTML = `<div class="ps-empty ps-error">
      <p>Data load nahi ho saka: ${escapeHtml(error.message)}</p>
      <button type="button" class="ps-retry" id="retry-btn">Retry</button>
    </div>`;
    document.getElementById("retry-btn").addEventListener("click", bootstrap);
    return;
  }

  SelectionSection.init();
  ProductSection.init();
  ShipmentSection.init();
}

document.addEventListener("DOMContentLoaded", () => {
  Navigation.init();
  bootstrap();
});