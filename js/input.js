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

  /* productTypes: productId -> "normal" | "mandatory" (insertion order = selection order) */
  const state = { currentCompanyId: "", productTypes: new Map() };

  const $ = (id) => document.getElementById(id);
  const els = {
    company: $("companySelect"),
    containerChips: $("containerChips"),
    warehouseChips: $("warehouseChips"),
    availBody: $("availableBody"),
    availCount: $("availableCount"),
    selectAll: $("selectAll"),
    selBody: $("selectedBody"),
    selFoot: $("selectedFoot"),
    selCount: $("selectedCount"),
    clearAll: $("clearProducts"),
    summary: $("summary"),
    messages: $("messages"),
    startBtn: $("startBtn")
  };

  /* ---------- Containers & warehouses (multi-select dropdowns) ---------- */
  const containerSelect = createMultiSelect({
    root: $("containerSelect"),
    placeholder: "Select containers",
    items: containers,
    optionHtml: (c) => `<span class="opt-name">${esc(c.name)}</span>
      <span class="opt-meta">${esc(c.id)}, max ${fmtKg(c.maxWeight)}, ${fmtM3(c.maxVolume)}</span>`,
    onChange: renderAll
  });

  const warehouseSelect = createMultiSelect({
    root: $("warehouseSelect"),
    placeholder: "Select warehouses",
    items: warehouses,
    optionHtml: (w) => `<span class="opt-name">${esc(w.name)}</span>
      <span class="opt-meta">${esc(w.location)}, ${fmtM3(w.availableCapacity)} available</span>`,
    onChange: renderAll
  });

  function renderChips(el, ids, map, detailFn, label) {
    el.innerHTML = ids.map((id) => {
      const item = map.get(id);
      return `<li class="chip">
        <div><strong>${esc(item.name)}</strong><span>${detailFn(item)}</span></div>
        <button type="button" class="chip-remove" data-id="${esc(id)}" aria-label="Remove ${label} ${esc(item.name)}">&times;</button>
      </li>`;
    }).join("");
  }

  els.containerChips.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip-remove");
    if (btn) containerSelect.remove(btn.dataset.id);
  });
  els.warehouseChips.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip-remove");
    if (btn) warehouseSelect.remove(btn.dataset.id);
  });

  /* ---------- Company dropdown ---------- */
  els.company.innerHTML = `<option value="">Select a company</option>` +
    companies.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
  els.company.addEventListener("change", () => {
    state.currentCompanyId = els.company.value;
    renderAll();
  });

  /* ---------- Product helpers ---------- */
  function selectedProducts() {
    return Array.from(state.productTypes, ([id, type]) => ({ ...productById.get(id), type }));
  }
  function addProduct(id, type) { state.productTypes.set(id, type || state.productTypes.get(id) || "normal"); }
  function removeProduct(id) { state.productTypes.delete(id); }

  function totals(list) {
    return list.reduce((t, p) => ({
      price: t.price + p.price, weight: t.weight + p.weight, volume: t.volume + p.volume
    }), { price: 0, weight: 0, volume: 0 });
  }

  /* ---------- Available products grid ---------- */
  function renderAvailable() {
    const list = products.filter((p) => p.companyId === state.currentCompanyId);

    if (!state.currentCompanyId) {
      els.availBody.innerHTML = `<tr><td colspan="6" class="empty">Choose a company above to see its products.</td></tr>`;
      els.availCount.textContent = "";
      els.selectAll.checked = false;
      els.selectAll.disabled = true;
      return;
    }

    els.selectAll.disabled = false;
    els.selectAll.checked = list.length > 0 && list.every((p) => state.productTypes.has(p.id));
    els.availCount.textContent = `${list.length} products from ${companyById.get(state.currentCompanyId).name}`;

    els.availBody.innerHTML = list.map((p) => {
      const picked = state.productTypes.has(p.id);
      const type = state.productTypes.get(p.id) || "normal";
      return `<tr class="${picked ? "is-selected" : ""}">
        <td class="col-check"><input type="checkbox" data-role="check" data-id="${p.id}" ${picked ? "checked" : ""} aria-label="Select ${esc(p.name)}"></td>
        <td>${esc(p.name)}<div class="sub">${p.id}</div></td>
        <td class="num">${fmtMoney(p.price)}</td>
        <td class="num">${fmtKg(p.weight)}</td>
        <td class="num">${fmtM3(p.volume)}</td>
        <td><div class="radio-group" role="radiogroup" aria-label="Selection type for ${esc(p.name)}">
          <label><input type="radio" name="type-${p.id}" value="normal" data-role="type" data-id="${p.id}" ${type === "normal" ? "checked" : ""}> Normal</label>
          <label><input type="radio" name="type-${p.id}" value="mandatory" data-role="type" data-id="${p.id}" ${type === "mandatory" ? "checked" : ""}> Mandatory</label>
        </div></td>
      </tr>`;
    }).join("");
  }

  els.availBody.addEventListener("change", (e) => {
    const { role, id } = e.target.dataset;
    if (!role) return;
    if (role === "check") {
      if (e.target.checked) addProduct(id); else removeProduct(id);
    } else if (role === "type") {
      addProduct(id, e.target.value); /* choosing a type also selects the product */
    }
    renderAll();
  });

  els.selectAll.addEventListener("change", () => {
    products.filter((p) => p.companyId === state.currentCompanyId).forEach((p) => {
      if (els.selectAll.checked) addProduct(p.id); else removeProduct(p.id);
    });
    renderAll();
  });

  /* ---------- Selected products grid ---------- */
  function renderSelected() {
    const list = selectedProducts();
    els.selCount.textContent = list.length ? `(${list.length})` : "";
    els.clearAll.hidden = list.length === 0;

    if (!list.length) {
      els.selBody.innerHTML = `<tr><td colspan="7" class="empty">No products selected yet. Pick a company and tick the products you want to ship.</td></tr>`;
      els.selFoot.innerHTML = "";
      return;
    }

    els.selBody.innerHTML = list.map((p) => `<tr>
      <td>${esc(companyById.get(p.companyId).name)}</td>
      <td>${esc(p.name)}<div class="sub">${p.id}</div></td>
      <td class="num">${fmtMoney(p.price)}</td>
      <td class="num">${fmtKg(p.weight)}</td>
      <td class="num">${fmtM3(p.volume)}</td>
      <td>
        <select class="compact" data-role="sel-type" data-id="${p.id}" aria-label="Selection type for ${esc(p.name)}">
          <option value="normal" ${p.type === "normal" ? "selected" : ""}>Normal</option>
          <option value="mandatory" ${p.type === "mandatory" ? "selected" : ""}>Mandatory</option>
        </select>
      </td>
      <td><button type="button" class="btn-danger-link" data-role="remove" data-id="${p.id}" aria-label="Remove ${esc(p.name)}">Remove</button></td>
    </tr>`).join("");

    const t = totals(list);
    els.selFoot.innerHTML = `<tr>
      <td colspan="2">Total</td>
      <td class="num">${fmtMoney(t.price)}</td>
      <td class="num">${fmtKg(t.weight)}</td>
      <td class="num">${fmtM3(t.volume)}</td>
      <td colspan="2"></td></tr>`;
  }

  els.selBody.addEventListener("change", (e) => {
    if (e.target.dataset.role === "sel-type") {
      state.productTypes.set(e.target.dataset.id, e.target.value);
      renderAll();
    }
  });
  els.selBody.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-role="remove"]');
    if (btn) { removeProduct(btn.dataset.id); renderAll(); }
  });
  els.clearAll.addEventListener("click", () => { state.productTypes.clear(); renderAll(); });

  /* ---------- Summary ---------- */
  function meter(label, used, max, fmt, emptyText) {
    const has = max > 0;
    const pct = has ? Math.min(100, (used / max) * 100) : 0;
    const over = has && used > max;
    return `<div class="meter ${over ? "over" : ""}">
      <div class="meter-head"><span>${label}</span><span>${fmt(used)} of ${has ? fmt(max) : emptyText}</span></div>
      <div class="meter-bar"><span style="width:${pct}%"></span></div></div>`;
  }

  function renderSummary() {
    const cIds = containerSelect.getSelected();
    const wIds = warehouseSelect.getSelected();
    const list = selectedProducts();
    const mandatory = list.filter((p) => p.type === "mandatory").length;
    const companyNames = [...new Set(list.map((p) => companyById.get(p.companyId).name))];
    const t = totals(list);
    const capW = cIds.reduce((s, id) => s + containerById.get(id).maxWeight, 0);
    const capV = cIds.reduce((s, id) => s + containerById.get(id).maxVolume, 0);
    const whFree = wIds.reduce((s, id) => s + warehouseById.get(id).availableCapacity, 0);

    els.summary.innerHTML = `
      <dl class="summary-grid">
        <div><dt>Selected containers</dt><dd>${cIds.length || "None"}
          ${cIds.length ? `<small>${cIds.map((id) => esc(containerById.get(id).name)).join(", ")}</small>` : ""}</dd></div>
        <div><dt>Selected companies</dt><dd>${companyNames.length || "None"}
          ${companyNames.length ? `<small>${companyNames.map(esc).join(", ")}</small>` : ""}</dd></div>
        <div><dt>Total selected products</dt><dd>${list.length}
          <small>${mandatory} mandatory, ${list.length - mandatory} normal</small></dd></div>
        <div><dt>Selected warehouses</dt><dd>${wIds.length || "None"}
          ${wIds.length ? `<small>${wIds.map((id) => esc(warehouseById.get(id).name)).join(", ")}</small>` : ""}</dd></div>
      </dl>
      <div class="meters">
        ${meter("Weight vs. containers", t.weight, capW, fmtKg, "no containers selected")}
        ${meter("Volume vs. containers", t.volume, capV, fmtM3, "no containers selected")}
        ${meter("Volume vs. warehouse space", t.volume, whFree, fmtM3, "no warehouses selected")}
      </div>`;
  }

  /* ---------- Render everything ---------- */
  function renderAll() {
    renderChips(els.containerChips, containerSelect.getSelected(), containerById,
      (c) => `${esc(c.id)}, max ${fmtKg(c.maxWeight)}, ${fmtM3(c.maxVolume)}`, "container");
    renderChips(els.warehouseChips, warehouseSelect.getSelected(), warehouseById,
      (w) => `${esc(w.location)}, ${fmtM3(w.availableCapacity)} free of ${fmtM3(w.totalCapacity)}`, "warehouse");
    renderAvailable();
    renderSelected();
    renderSummary();
    els.messages.innerHTML = "";
  }

  /* ---------- Validation (frontend demonstration logic) ---------- */
  /* First-fit decreasing: place items into container "bins" respecting weight AND volume. */
  function pack(items, bins) {
    const unplaced = [];
    [...items].sort((a, b) => b.volume - a.volume || b.weight - a.weight).forEach((p) => {
      const bin = bins.find((b) => b.w + p.weight <= b.maxWeight && b.v + p.volume <= b.maxVolume);
      if (bin) { bin.w += p.weight; bin.v += p.volume; } else { unplaced.push(p); }
    });
    return unplaced;
  }

  function validate() {
    const errors = [];
    const warnings = [];
    const cIds = containerSelect.getSelected();
    const wIds = warehouseSelect.getSelected();
    const list = selectedProducts();

    if (!cIds.length) errors.push("Select at least one container.");
    if (!list.length) errors.push("Select at least one product.");
    if (!wIds.length) errors.push("Select at least one warehouse.");
    if (errors.length) return { errors, warnings };

    const bins = cIds.map((id) => ({ w: 0, v: 0, maxWeight: containerById.get(id).maxWeight, maxVolume: containerById.get(id).maxVolume }));
    const mandatory = list.filter((p) => p.type === "mandatory");
    const normal = list.filter((p) => p.type === "normal");

    const mandatoryLeft = pack(mandatory, bins);
    if (mandatoryLeft.length) {
      errors.push(`Mandatory products do not fit in the selected containers: ${mandatoryLeft.map((p) => p.name).join(", ")}. Add another container or change these products to Normal.`);
    } else {
      const normalLeft = pack(normal, bins);
      if (normalLeft.length) {
        warnings.push(`These normal products may be delayed because container capacity is insufficient: ${normalLeft.map((p) => p.name).join(", ")}.`);
      }
    }

    const whFree = wIds.reduce((s, id) => s + warehouseById.get(id).availableCapacity, 0);
    const mandatoryVol = totals(mandatory).volume;
    const allVol = totals(list).volume;
    if (mandatoryVol > whFree) {
      errors.push(`Mandatory products need ${fmtM3(mandatoryVol)} but the selected warehouses only have ${fmtM3(whFree)} available. Select more warehouses.`);
    } else if (allVol > whFree) {
      warnings.push(`All selected products need ${fmtM3(allVol)} but the selected warehouses only have ${fmtM3(whFree)} available.`);
    }
    return { errors, warnings };
  }

  function showErrors(errors) {
    els.messages.innerHTML = `<div class="alert alert-error" role="alert">
      <strong>Fix the following before continuing</strong>
      <ul>${errors.map((m) => `<li>${esc(m)}</li>`).join("")}</ul></div>`;
    els.messages.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function showWarnings(warnings) {
    els.messages.innerHTML = `<div class="alert alert-warn" role="alert">
      <strong>Capacity warning</strong>
      <ul>${warnings.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
      <p style="margin-top:8px">All mandatory products fit. Normal products that do not fit will be delayed, not removed.</p>
      <div class="alert-actions">
        <button type="button" class="btn btn-primary" id="continueAnyway">Continue anyway</button>
        <button type="button" class="btn" id="reviewSelection">Review selection</button>
      </div></div>`;
    $("continueAnyway").addEventListener("click", proceed);
    $("reviewSelection").addEventListener("click", () => { els.messages.innerHTML = ""; });
    els.messages.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function proceed() {
    saveShipmentInput({
      containerIds: containerSelect.getSelected(),
      warehouseIds: warehouseSelect.getSelected(),
      products: selectedProducts().map((p) => ({ productId: p.id, companyId: p.companyId, type: p.type })),
      savedAt: new Date().toISOString()
    });
    window.location.href = "processing.html";
  }

  els.startBtn.addEventListener("click", () => {
    const { errors, warnings } = validate();
    if (errors.length) return showErrors(errors);
    if (warnings.length) return showWarnings(warnings);
    proceed();
  });

  /* ---------- Restore a previous selection (e.g. user pressed Back) ---------- */
  const saved = loadShipmentInput();
  if (saved) {
    containerSelect.setSelected((saved.containerIds || []).filter((id) => containerById.has(id)));
    warehouseSelect.setSelected((saved.warehouseIds || []).filter((id) => warehouseById.has(id)));
    (saved.products || []).forEach((p) => { if (productById.has(p.productId)) state.productTypes.set(p.productId, p.type); });
    if (saved.products && saved.products.length) {
      state.currentCompanyId = saved.products[0].companyId;
      els.company.value = state.currentCompanyId;
    }
  }
  renderAll();
})();
