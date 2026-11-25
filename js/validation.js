/* ===== LogiRoute shipment validation (UI independent) =====
   Pure functions: later they can be mirrored by, or replaced with, a Web API call. */
const LogiValidation = (() => {
  const sum = (list, key) => list.reduce((s, x) => s + x[key], 0);

  function calcTotals({ containers, warehouses, products }) {
    return {
      weight: sum(products, "weight"),
      volume: sum(products, "volume"),
      price: sum(products, "price"),
      capWeight: sum(containers, "maxWeight"),
      capVolume: sum(containers, "maxVolume"),
      warehouseAvailable: sum(warehouses, "availableCapacity")
    };
  }

  /* First-fit decreasing: returns products that fit in no container (weight AND volume). */
  function findUnplaceable(products, containers) {
    const bins = containers.map((c) => ({ w: 0, v: 0, maxW: c.maxWeight, maxV: c.maxVolume }));
    const left = [];
    [...products].sort((a, b) => b.volume - a.volume || b.weight - a.weight).forEach((p) => {
      const bin = bins.find((b) => b.w + p.weight <= b.maxW && b.v + p.volume <= b.maxV);
      if (bin) { bin.w += p.weight; bin.v += p.volume; } else left.push(p);
    });
    return left;
  }

  /* Returns { valid, errors: [{ type: "required" | "capacity", message }], totals }.
     Products are never removed or modified here. */
  function validateShipment({ containers, warehouses, products }) {
    const errors = [];
    if (!containers.length) errors.push({ type: "required", message: "Select at least one container." });
    if (!products.length) errors.push({ type: "required", message: "Select at least one product." });
    if (!warehouses.length) errors.push({ type: "required", message: "Select at least one warehouse." });

    const totals = calcTotals({ containers, warehouses, products });
    if (errors.length) return { valid: false, errors, totals };

    if (totals.weight > totals.capWeight) {
      errors.push({ type: "capacity", message: `Selected products weigh ${fmtKg(totals.weight)}, but the selected containers carry at most ${fmtKg(totals.capWeight)} (over by ${fmtKg(totals.weight - totals.capWeight)}).` });
    }
    if (totals.volume > totals.capVolume) {
      errors.push({ type: "capacity", message: `Selected products occupy ${fmtM3(totals.volume)}, but the selected containers hold at most ${fmtM3(totals.capVolume)} (over by ${fmtM3(totals.volume - totals.capVolume)}).` });
    }
    if (!errors.length) {
      const left = findUnplaceable(products, containers);
      if (left.length) {
        errors.push({ type: "capacity", message: `These products cannot be placed in any container without exceeding its limits: ${left.map((p) => p.name).join(", ")}.` });
      }
    }
    if (totals.volume > totals.warehouseAvailable) {
      errors.push({ type: "capacity", message: `Selected products need ${fmtM3(totals.volume)} of storage, but the selected warehouses have ${fmtM3(totals.warehouseAvailable)} available.` });
    }
    return { valid: errors.length === 0, errors, totals };
  }

  return { calcTotals, validateShipment };
})();
