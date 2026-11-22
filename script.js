"use strict";

// Semua pemrosesan gambar terjadi di browser ini pakai Canvas API.
// Gak ada file yang dikirim ke server mana pun.

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const formatEl = document.getElementById("format");
const qualityEl = document.getElementById("quality");
const qualityValueEl = document.getElementById("quality-value");
const maxWidthEl = document.getElementById("max-width");
const gridEl = document.getElementById("card-grid");
const emptyEl = document.getElementById("empty-state");
const downloadAllBtn = document.getElementById("download-all");
const clearAllBtn = document.getElementById("clear-all");
const totalLineEl = document.getElementById("total-line");

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

let items = [];
let nextId = 1;

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1).replace(".", ",") + " KB";
  return (bytes / (1024 * 1024)).toFixed(2).replace(".", ",") + " MB";
}

function getSettings() {
  return {
    format: formatEl.value,
    quality: Number(qualityEl.value) / 100,
    maxWidth: Number(maxWidthEl.value),
  };
}

function outputName(originalName, format) {
  const base = originalName.replace(/\.[^.]+$/, "");
  return base + "-kompres." + EXTENSIONS[format];
}

/* ---------- Menambah gambar ---------- */

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function addFiles(fileList) {
  const files = Array.from(fileList).filter((f) => ACCEPTED_TYPES.includes(f.type));
  for (const file of files) {
    const item = {
      id: nextId++,
      file,
      name: file.name,
      origSize: file.size,
      thumbUrl: URL.createObjectURL(file),
      img: null,
      outBlob: null,
      outUrl: null,
      outName: "",
      outSize: 0,
      status: "loading",
    };
    items.push(item);
    renderItem(item);
    try {
      item.img = await loadImage(item.thumbUrl);
      item.status = "ready";
      await processItem(item);
    } catch {
      item.status = "error";
      renderItem(item);
    }
  }
  updateSummary();
}

/* ---------- Pemrosesan Canvas ---------- */

async function processItem(item) {
  if (!item.img) return;
  const { format, quality, maxWidth } = getSettings();

  let width = item.img.naturalWidth;
  let height = item.img.naturalHeight;
  if (maxWidth > 0 && width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  // JPG gak kenal transparansi — kasih latar putih biar PNG transparan gak jadi hitam.
  if (format === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(item.img, 0, 0, width, height);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, format, quality)
  );
  if (!blob) {
    item.status = "error";
    renderItem(item);
    return;
  }

  if (item.outUrl) URL.revokeObjectURL(item.outUrl);
  item.outBlob = blob;
  item.outSize = blob.size;
  item.outUrl = URL.createObjectURL(blob);
  item.outName = outputName(item.name, format);
  item.status = "done";
  renderItem(item);
}

async function reprocessAll() {
  for (const item of items) {
    if (item.status === "done" || item.img) {
      item.status = "ready";
      await processItem(item);
    }
  }
  updateSummary();
}

/* ---------- Render kartu ---------- */

function savingsBadge(item) {
  if (item.status === "error") return `<span class="savings bigger">Gagal diproses</span>`;
  if (item.status !== "done") return `<span class="savings processing">Memproses…</span>`;
  const pct = Math.round((1 - item.outSize / item.origSize) * 100);
  if (pct > 0) return `<span class="savings">Hemat ${pct}%</span>`;
  if (pct === 0) return `<span class="savings">Ukuran sama</span>`;
  return `<span class="savings bigger">${Math.abs(pct)}% lebih besar</span>`;
}

function renderItem(item) {
  let card = gridEl.querySelector(`[data-id="${item.id}"]`);
  if (!card) {
    card = document.createElement("article");
    card.className = "img-card";
    card.dataset.id = item.id;
    gridEl.appendChild(card);
  }

  const dims = item.img
    ? `${item.img.naturalWidth}×${item.img.naturalHeight} px`
    : "…";
  const outLine =
    item.status === "done"
      ? `Hasil: <strong>${formatSize(item.outSize)}</strong> · ${item.outName}`
      : item.status === "error"
        ? "File ini gak bisa dibaca sebagai gambar."
        : "Hasil: sedang dihitung…";

  card.innerHTML = `
    <img src="${item.thumbUrl}" alt="Pratinjau ${item.name}">
    <p class="card-name" title="${item.name}">${item.name}</p>
    ${savingsBadge(item)}
    <p class="card-meta">Asli: <strong>${formatSize(item.origSize)}</strong> · ${dims}<br>${outLine}</p>
    <div class="card-actions">
      <button class="btn btn-pink btn-small" type="button" data-action="download" ${item.status === "done" ? "" : "disabled"}>Download</button>
      <button class="btn btn-small btn-remove" type="button" data-action="remove" aria-label="Hapus ${item.name}">✕</button>
    </div>`;

  card.querySelector('[data-action="download"]').addEventListener("click", () => downloadItem(item));
  card.querySelector('[data-action="remove"]').addEventListener("click", () => removeItem(item.id));
  updateSummary();
}

function updateSummary() {
  const hasItems = items.length > 0;
  emptyEl.hidden = hasItems;
  downloadAllBtn.hidden = !hasItems;
  clearAllBtn.hidden = !hasItems;

  const done = items.filter((i) => i.status === "done");
  if (done.length === 0) {
    totalLineEl.hidden = true;
    downloadAllBtn.disabled = true;
    return;
  }
  const totalOrig = done.reduce((sum, i) => sum + i.origSize, 0);
  const totalOut = done.reduce((sum, i) => sum + i.outSize, 0);
  const pct = Math.round((1 - totalOut / totalOrig) * 100);
  totalLineEl.hidden = false;
  totalLineEl.textContent =
    `${done.length} gambar: ${formatSize(totalOrig)} → ${formatSize(totalOut)}` +
    (pct > 0 ? ` (hemat ${pct}%)` : pct < 0 ? ` (${Math.abs(pct)}% lebih besar)` : "");
  downloadAllBtn.disabled = false;
}

/* ---------- Download & hapus ---------- */

function triggerDownload(url, name) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function downloadItem(item) {
  if (item.outUrl) triggerDownload(item.outUrl, item.outName);
}

function downloadAll() {
  const done = items.filter((i) => i.status === "done");
  // Browser biasanya memblokir banyak download yang nempel rapat,
  // jadi kasih jeda dikit antar file.
  done.forEach((item, idx) => {
    setTimeout(() => downloadItem(item), idx * 350);
  });
}

function removeItem(id) {
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return;
  const [item] = items.splice(idx, 1);
  URL.revokeObjectURL(item.thumbUrl);
  if (item.outUrl) URL.revokeObjectURL(item.outUrl);
  const card = gridEl.querySelector(`[data-id="${id}"]`);
  if (card) card.remove();
  updateSummary();
}

function clearAll() {
  for (const item of items) {
    URL.revokeObjectURL(item.thumbUrl);
    if (item.outUrl) URL.revokeObjectURL(item.outUrl);
  }
  items = [];
  gridEl.innerHTML = "";
  updateSummary();
}

/* ---------- Event: pilih file & drag-drop ---------- */

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});
fileInput.addEventListener("change", () => {
  addFiles(fileInput.files);
  fileInput.value = "";
});

for (const evt of ["dragenter", "dragover"]) {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add("dragging");
  });
}
for (const evt of ["dragleave", "drop"]) {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragging");
  });
}
dropzone.addEventListener("drop", (e) => {
  addFiles(e.dataTransfer.files);
});
// Cegah browser membuka file kalau dijatuhkan di luar dropzone.
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());

/* ---------- Event: pengaturan berubah → proses ulang ---------- */

let reprocessTimer = null;
function scheduleReprocess() {
  clearTimeout(reprocessTimer);
  reprocessTimer = setTimeout(reprocessAll, 150);
}

formatEl.addEventListener("change", scheduleReprocess);
maxWidthEl.addEventListener("change", scheduleReprocess);
qualityEl.addEventListener("input", () => {
  qualityValueEl.textContent = qualityEl.value;
  scheduleReprocess();
});

downloadAllBtn.addEventListener("click", downloadAll);
clearAllBtn.addEventListener("click", clearAll);

updateSummary();
