/* ===== Page 2: Processing (placeholder) ===== */
renderHeader(2);
(function () {
  const saved = loadShipmentInput();
  if (saved) document.getElementById("savedData").textContent = JSON.stringify(saved, null, 2);
})();
