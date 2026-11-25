/* ===== Shared helpers used by all pages ===== */

const STORAGE_KEY = "shipmentInput";

/* Data access layer: replace these bodies with fetch() calls to the ASP.NET Core API later.
   The rest of the UI only depends on these async functions. */
const clone = (x) => JSON.parse(JSON.stringify(x));
const api = {
  getCompanies:  async () => clone(COMPANIES),
  getProducts:   async () => clone(PRODUCTS),
  getContainers: async () => clone(CONTAINERS),
  getWarehouses: async () => clone(WAREHOUSES)
};

/* sessionStorage helpers */
function saveShipmentInput(data) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function loadShipmentInput() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY));
  } catch (e) {
    return null;
  }
}

/* Formatting */
const fmtMoney = (n) => "$" + Number(n).toLocaleString("en-US");
const fmtKg = (n) => Number(n).toLocaleString("en-US") + " kg";
const fmtM3 = (n) => Number(Number(n).toFixed(2)).toLocaleString("en-US") + " m³";

function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function byId(list) {
  const map = new Map();
  list.forEach((item) => map.set(item.id, item));
  return map;
}

/* Shared header with the three-step navigation */
function renderHeader(activeStep) {
  const steps = [
    { n: 1, label: "Input", href: "index.html" },
    { n: 2, label: "Processing", href: "processing.html" },
    { n: 3, label: "Output", href: "output.html" }
  ];
  const host = document.getElementById("app-header");
  if (!host) return;
  host.className = "app-header";
  host.innerHTML = `
    <div class="app-header-inner">
      <a class="brand" href="index.html">Shipment Manager</a>
      <nav aria-label="Workflow steps">
        <ol class="steps">
          ${steps.map((s) => `
            <li><a href="${s.href}" ${s.n === activeStep ? 'aria-current="page"' : ""}>
              <span class="step-no">${s.n}</span>${s.label}</a></li>`).join("")}
        </ol>
      </nav>
    </div>`;
}

/* Reusable multi-select dropdown (checkbox list inside a toggle panel).
   Returns { getSelected, setSelected, remove }. */
function createMultiSelect({ root, placeholder, items, optionHtml, onChange }) {
  const selected = new Set();
  root.classList.add("ms");
  root.innerHTML = `
    <button type="button" class="ms-toggle" aria-haspopup="listbox" aria-expanded="false">
      <span class="ms-text"></span><span class="ms-caret" aria-hidden="true"></span>
    </button>
    <div class="ms-panel" role="listbox" aria-multiselectable="true" hidden></div>`;

  const toggle = root.querySelector(".ms-toggle");
  const text = root.querySelector(".ms-text");
  const panel = root.querySelector(".ms-panel");

  panel.innerHTML = items.map((item) => `
    <label class="ms-option" role="option">
      <input type="checkbox" value="${esc(item.id)}">
      <span>${optionHtml(item)}</span>
    </label>`).join("");

  function sync() {
    panel.querySelectorAll("input").forEach((cb) => { cb.checked = selected.has(cb.value); });
    text.textContent = selected.size ? `${selected.size} selected` : placeholder;
    text.classList.toggle("is-placeholder", selected.size === 0);
  }
  function open(state) {
    panel.hidden = !state;
    toggle.setAttribute("aria-expanded", String(state));
  }
  function notify() {
    sync();
    if (onChange) onChange(Array.from(selected));
  }

  toggle.addEventListener("click", () => open(panel.hidden));
  panel.addEventListener("change", (e) => {
    const cb = e.target;
    if (cb.checked) selected.add(cb.value); else selected.delete(cb.value);
    notify();
  });
  document.addEventListener("click", (e) => { if (!root.contains(e.target)) open(false); });
  root.addEventListener("keydown", (e) => { if (e.key === "Escape") { open(false); toggle.focus(); } });

  sync();
  return {
    getSelected: () => Array.from(selected),
    setSelected: (ids) => { selected.clear(); ids.forEach((id) => selected.add(id)); sync(); },
    remove: (id) => { selected.delete(id); notify(); }
  };
}
