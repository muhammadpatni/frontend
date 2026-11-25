/* ===== Page 3: Output (placeholder) ===== */
renderHeader(3);
(function () {
  const saved = loadShipmentInput();
  if (saved) document.getElementById("savedData").textContent = JSON.stringify(saved, null, 2);
})();
