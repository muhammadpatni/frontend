/* ===== Page 1: Shipment Input ===== */
(async function initInputPage() {
  renderHeader(1);

  const [companies, products, containers, warehouses] = await Promise.all([
    api.getCompanies(), api.getProducts(), api.getContainers(), api.getWarehouses()
  ]);
  const companyById = byId(companies);
  const productById = byId(products);
  const containerById = byId(containers);
  const warehouseById = byId(warehouses);

  const $ = (id) => document.getElementById(id);
  let currentCompanyId = companies[0].id;

  /* ---------- Containers ---------- */
  const containerSelect = createTagSelect({
    root: $("containerSelect"),
    leadIcon: "container",
    placeholder: "Search and select containers",
    items: containers,
    getText: (c) => `${c.id} ${c.name}`,
    tagLabel: (c) => c.name,
    tagTitle: (c) => `${c.id}: ${c.name}`,
    optionHtml: (c) => `<span class="opt-icon">${icon("container")}</span>
      <span class="opt-body">
        <span class="opt-title">${esc(c.name)}<span class="opt-id">${esc(c.id)}</span></span>
        <span class="opt-meta">${metaItem("weight", "Max " + fmtKg(c.maxWeight))}${metaItem("cube", "Max " + fmtM3(c.maxVolume))}</span>
      </span>`,
    onChange: refresh
  });

  /* ---------- Warehouses ---------- */
  const warehouseSelect = createTagSelect({
    root: $("warehouseSelect"),
    leadIcon: "warehouse",
    placeholder: "Search and select warehouses",
    items: warehouses,
    getText: (w) => `${w.id} ${w.name} ${w.location}`,
    tagLabel: (w) => w.name,
    tagTitle: (w) => `${w.id}: ${w.name}, ${w.location}`,
    optionHtml: (w) => `<span class="opt-icon">${icon("warehouse")}</span>
      <span class="opt-body">
        <span class="opt-title">${esc(w.name)}<span class="opt-id">${esc(w.id)}</span></span>
        <span class="opt-meta">${metaItem("pin", w.location)}</span>
        <span class="opt-meta"><span>Total ${fmtM3(w.totalCapacity)}</span><span>Occupied ${fmtM3(w.occupiedCapacity)}</span><span class="meta-strong">Available ${fmtM3(w.availableCapacity)}</span></span>
      </span>`,
    onChange: refresh
  });

  /* ---------- Products (options follow the selected company; selections are kept) ---------- */
  const productSelect = createTagSelect({
    root: $("productSelect"),
    leadIcon: "search",
    placeholder: "Search and select products",
    items: products,
    getText: (p) => `${p.id} ${p.name}`,
    tagLabel: (p) => p.name,
    tagTitle: (p) => `${p.name} (${p.id}) from ${companyById.get(p.companyId).name}`,
    emptyText: "This company has no products.",
    optionHtml: (p) => `<span class="opt-icon">${icon("box")}</span>
      <span class="opt-body">
        <span class="opt-title">${esc(p.name)}<span class="opt-id">${esc(p.id)}</span></span>
        <span class="opt-meta">${metaItem("weight", fmtKg(p.weight))}${metaItem("cube", fmtM3(p.volume))}${metaItem("dollar", fmtMoney(p.price))}</span>
      </span>`,
    onChange: onProductsChange
  });

  /* ---------- Mandatory products (choose from the products already selected) ---------- */
  const mandatorySelect = createTagSelect({
    root: $("mandatorySelect"),
    leadIcon: "flag",
    placeholder: "Search selected products to mark as mandatory",
    items: products,
    getText: (p) => `${p.id} ${p.name}`,
    tagLabel: (p) => p.name,
    tagTitle: (p) => `Mandatory: ${p.name} (${p.id}) from ${companyById.get(p.companyId).name}`,
    emptyText: "Select products above first.",
    optionHtml: (p) => `<span class="opt-icon">${icon("flag")}</span>
      <span class="opt-body">
        <span class="opt-title">${esc(p.name)}<span class="opt-id">${esc(p.id)}</span></span>
        <span class="opt-meta">${metaItem("building", companyById.get(p.companyId).name)}${metaItem("weight", fmtKg(p.weight))}${metaItem("cube", fmtM3(p.volume))}</span>
      </span>`,
    onChange: refresh
  });
  mandatorySelect.setOptions([]);

  /* Keep the mandatory list in step with the selected products */
  function onProductsChange(ids) {
    mandatorySelect.setOptions(ids.map((id) => productById.get(id)));
    mandatorySelect.setSelected(mandatorySelect.getSelected().filter((id) => ids.includes(id)));
    refresh();
  }

  /* ---------- Company dropdown ---------- */
  const companySel = $("companySelect");
  companySel.innerHTML = companies.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
  companySel.addEventListener("change", () => { currentCompanyId = companySel.value; applyCompany(); refresh(); });

  function applyCompany() {
    productSelect.setOptions(products.filter((p) => p.companyId === currentCompanyId));
  }

  /* ---------- Current selection (always resolved from IDs) ---------- */
  function current() {
    return {
      containers: containerSelect.getSelected().map((id) => containerById.get(id)),
      warehouses: warehouseSelect.getSelected().map((id) => warehouseById.get(id)),
      products: productSelect.getSelected().map((id) => productById.get(id))
    };
  }

  /* ---------- Rendering ---------- */
  function meterCell(labelIcon, label, used, cap, fmt) {
    const over = cap > 0 && used > cap;
    const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
    return `<div class="total-cell ${over ? "over" : ""}">
      <div class="total-label">${icon(labelIcon, "icon-sm")}${label}</div>
      <div class="total-value">${fmt(used)} ${cap ? `<small>of ${fmt(cap)}</small>` : ""}</div>
      <div class="meter ${over ? "over" : ""}"><span style="width:${pct}%"></span></div></div>`;
  }

  function refresh() {
    const sel = current();
    const t = LogiValidation.calcTotals(sel);
    const companyCount = new Set(sel.products.map((p) => p.companyId)).size;

    $("totalCount").textContent = sel.products.length;

    const available = products.filter((p) => p.companyId === currentCompanyId).length;
    $("companyHint").innerHTML = `${icon("box", "icon-sm")}${available} products available. Selections from other companies are kept.`;
    $("containerHint").innerHTML = sel.containers.length
      ? `Combined capacity: ${metaItem("weight", fmtKg(t.capWeight))}${metaItem("cube", fmtM3(t.capVolume))}`
      : "Select one or more containers.";
    $("warehouseHint").innerHTML = sel.warehouses.length
      ? `Combined space available: ${metaItem("cube", fmtM3(t.warehouseAvailable))}`
      : "Select one or more destination warehouses.";

    $("totals").innerHTML = `
      <div class="total-cell">
        <div class="total-label">${icon("box", "icon-sm")}Selected products</div>
        <div class="total-value">${sel.products.length}</div></div>
      ${meterCell("weight", "Total weight", t.weight, t.capWeight, fmtKg)}
      ${meterCell("cube", "Total volume", t.volume, t.capVolume, fmtM3)}
      <div class="total-cell">
        <div class="total-label">${icon("dollar", "icon-sm")}Total value</div>
        <div class="total-value">${fmtMoney(t.price)}</div></div>`;

    $("sumContainers").textContent = sel.containers.length;
    $("sumCompanies").textContent = companyCount;
    $("sumProducts").textContent = sel.products.length;
    const mandatoryCount = mandatorySelect.getSelected().length;
    $("sumMandatory").textContent = mandatoryCount;
    $("mandatoryHint").innerHTML = sel.products.length
      ? `${icon("flag", "icon-sm")}${mandatoryCount} of ${sel.products.length} selected products marked mandatory. Mandatory products are never dropped.`
      : "Select products first, then mark any mandatory ones here.";
    $("sumWarehouses").textContent = sel.warehouses.length;
    $("sumWarehouseList").innerHTML = sel.warehouses
      .map((w) => `<li>${icon("pin")}<span>${esc(w.name)}, ${esc(w.location)}</span></li>`).join("");

    $("messages").innerHTML = "";
  }

  /* ---------- Validation feedback ---------- */
  function showMessages(result) {
    const required = result.errors.filter((e) => e.type === "required");
    const isRequired = required.length > 0;
    const items = (isRequired ? required : result.errors).map((e) => `<li>${esc(e.message)}</li>`).join("");
    $("messages").innerHTML = isRequired
      ? `<div class="alert alert-error" role="alert">${icon("alert")}<div><strong>Complete your selection to continue</strong><ul>${items}</ul></div></div>`
      : `<div class="alert alert-warn" role="alert">${icon("alert")}<div><strong>Capacity exceeded. No products have been removed.</strong>
         <ul>${items}</ul><p style="margin-top:6px">Add containers or warehouses, or remove products from the selection, then try again.</p></div></div>`;
    $("messages").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  $("startBtn").addEventListener("click", () => {
    const sel = current();
    const mandatoryIds = mandatorySelect.getSelected();
    const result = LogiValidation.validateShipment(sel);
    if (!result.valid) return showMessages(result);

    saveShipmentInput({
      companyId: currentCompanyId,
      containerIds: sel.containers.map((c) => c.id),
      warehouseIds: sel.warehouses.map((w) => w.id),
      products: sel.products.map((p) => ({ productId: p.id, companyId: p.companyId, mandatory: mandatoryIds.includes(p.id) })),
      mandatoryProductIds: mandatoryIds,
      totals: result.totals,
      savedAt: new Date().toISOString()
    });
    window.location.href = "processing.html";
  });

  /* ---------- Restore earlier selection (Back navigation) ---------- */
  const saved = loadShipmentInput();
  if (saved) {
    if (companyById.has(saved.companyId)) currentCompanyId = saved.companyId;
    containerSelect.setSelected(saved.containerIds || []);
    warehouseSelect.setSelected(saved.warehouseIds || []);
    productSelect.setSelected((saved.products || []).map((p) => p.productId));
    mandatorySelect.setOptions(productSelect.getSelected().map((id) => productById.get(id)));
    mandatorySelect.setSelected(saved.mandatoryProductIds || []);
  }
  companySel.value = currentCompanyId;
  applyCompany();
  refresh();
})();
