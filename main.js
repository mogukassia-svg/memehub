import { drawMeme, pickLineAtPoint } from "./drawMeme.js";

/** 中文字体与风格（Google Fonts + 系统字体回退） */
const FONT_STACKS = {
  "noto-sans":
    '"Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  "noto-serif":
    '"Noto Serif SC", "Songti SC", "STSong", "SimSun", serif',
  "zcool-xiaowei":
    '"ZCOOL XiaoWei", "PingFang SC", "Microsoft YaHei", sans-serif',
  "ma-shan": '"Ma Shan Zheng", "Kaiti SC", "STKaiti", cursive',
  "zcool-huangyou":
    '"ZCOOL QingKe HuangYou", "Noto Sans SC", "PingFang SC", sans-serif',
  kaiti: '"Kaiti SC", "STKaiti", "BiauKai", "KaiTi", "Songti SC", serif',
  impact: 'Impact, "Arial Black", "Noto Sans SC", sans-serif',
};

const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const previewDropTarget = document.getElementById("previewDropTarget");
const textLine1 = document.getElementById("textLine1");
const textLine2 = document.getElementById("textLine2");
const fontFamilySelect = document.getElementById("fontFamilySelect");
const fontSize1Input = document.getElementById("fontSize1Input");
const fontSize1Value = document.getElementById("fontSize1Value");
const fontSize2Input = document.getElementById("fontSize2Input");
const fontSize2Value = document.getElementById("fontSize2Value");
const angle1Input = document.getElementById("angle1Input");
const angle1Value = document.getElementById("angle1Value");
const angle2Input = document.getElementById("angle2Input");
const angle2Value = document.getElementById("angle2Value");
const downloadBtn = document.getElementById("downloadBtn");
const removeBgBtn = document.getElementById("removeBgBtn");
const hint = document.getElementById("hint");
const canvas = document.getElementById("canvas");

/** @type {CanvasRenderingContext2D | null} */
const ctx = canvas.getContext("2d");

function getFontFamilyCss() {
  const key = fontFamilySelect?.value ?? "noto-sans";
  return FONT_STACKS[key] ?? FONT_STACKS["noto-sans"];
}

const state = {
  /** @type {HTMLImageElement | null} */
  image: null,
  line1: "",
  line2: "",
  fontSize1: Number(fontSize1Input.value) || 48,
  fontSize2: Number(fontSize2Input.value) || 48,
  angle1Deg: Number(angle1Input.value) || 0,
  angle2Deg: Number(angle2Input.value) || 0,
  strokeColor: "#000000",
  /** @type {number | null} */
  anchor1X: null,
  /** @type {number | null} */
  anchor1Y: null,
  /** @type {number | null} */
  anchor2X: null,
  /** @type {number | null} */
  anchor2Y: null,
  isDragging: false,
  /** @type {0 | 1 | 2} */
  draggingLine: 0,
  dragOffsetX: 0,
  dragOffsetY: 0,
  removingBg: false,
};

function setHint(message) {
  hint.textContent = message;
}

function setDownloadEnabled(enabled) {
  downloadBtn.disabled = !enabled;
}

function syncRemoveBgButton() {
  if (removeBgBtn) {
    removeBgBtn.disabled = !state.image || state.removingBg;
  }
}

function getSelectedStrokeColor() {
  const el = document.querySelector('input[name="stroke"]:checked');
  return el?.value ?? "#000000";
}

function effectiveAnchor1() {
  const w = canvas.width;
  const h = canvas.height;
  return {
    x: state.anchor1X ?? w / 2,
    y: state.anchor1Y ?? h * 0.14,
  };
}

function effectiveAnchor2() {
  const w = canvas.width;
  const h = canvas.height;
  return {
    x: state.anchor2X ?? w / 2,
    y: state.anchor2Y ?? h * 0.82,
  };
}

function redraw() {
  drawMeme({
    ctx,
    canvas,
    image: state.image,
    line1: state.line1,
    line2: state.line2,
    fontSize1: state.fontSize1,
    fontSize2: state.fontSize2,
    angle1Deg: state.angle1Deg,
    angle2Deg: state.angle2Deg,
    strokeColor: state.strokeColor,
    anchor1X: state.anchor1X ?? undefined,
    anchor1Y: state.anchor1Y ?? undefined,
    anchor2X: state.anchor2X ?? undefined,
    anchor2Y: state.anchor2Y ?? undefined,
    fontFamily: getFontFamilyCss(),
  });
}

function resetTextAnchors() {
  const w = canvas.width;
  const h = canvas.height;
  state.anchor1X = w / 2;
  state.anchor1Y = h * 0.14;
  state.anchor2X = w / 2;
  state.anchor2Y = h * 0.82;
}

function fitCanvasToImage(img) {
  const maxW = 1400;
  const maxH = 1400;
  const scale = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  resetTextAnchors();
}

function marginForDrag() {
  return Math.max(24, Math.round(Math.max(state.fontSize1, state.fontSize2) * 0.65));
}

function clampPair(x, y) {
  const m = marginForDrag();
  return {
    x: Math.min(canvas.width - m, Math.max(m, x)),
    y: Math.min(canvas.height - m, Math.max(m, y)),
  };
}

function clampAllAnchors() {
  const a1 = clampPair(effectiveAnchor1().x, effectiveAnchor1().y);
  const a2 = clampPair(effectiveAnchor2().x, effectiveAnchor2().y);
  state.anchor1X = a1.x;
  state.anchor1Y = a1.y;
  state.anchor2X = a2.x;
  state.anchor2Y = a2.y;
}

function canvasCoordsFromEvent(e) {
  const r = canvas.getBoundingClientRect();
  const sx = canvas.width / r.width;
  const sy = canvas.height / r.height;
  const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
  const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - r.left) * sx,
    y: (clientY - r.top) * sy,
  };
}

async function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片加载失败"));
    };
    img.src = url;
  });
}

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片加载失败"));
    };
    img.src = url;
  });
}

function clearImageState() {
  state.image = null;
  state.anchor1X = null;
  state.anchor1Y = null;
  state.anchor2X = null;
  state.anchor2Y = null;
  setDownloadEnabled(false);
  syncRemoveBgButton();
  setHint("请先选择或拖入底图。在预览中点选文本后可拖动调整位置。");
  redraw();
}

async function applyImageFile(file) {
  if (!file) {
    clearImageState();
    return;
  }
  if (!file.type.startsWith("image/")) {
    setHint("请使用图片文件（如 PNG、JPG、WebP）。");
    return;
  }

  try {
    setHint("正在加载底图…");
    const img = await loadImageFromFile(file);
    state.image = img;
    fitCanvasToImage(img);
    setHint(
      "底图已加载。请设置文本与参数；在预览画布点选对应行后拖动以调整位置。",
    );
    setDownloadEnabled(true);
    syncRemoveBgButton();
    redraw();
  } catch {
    state.image = null;
    state.anchor1X = null;
    state.anchor1Y = null;
    state.anchor2X = null;
    state.anchor2Y = null;
    setDownloadEnabled(false);
    syncRemoveBgButton();
    setHint("底图加载失败，请更换文件后重试。");
    redraw();
  }
}

fileInput.addEventListener("change", () => {
  applyImageFile(fileInput.files?.[0] ?? null);
});

function setPreviewDragActive(active) {
  dropZone?.classList.toggle("dropZone--active", active);
  previewDropTarget?.classList.toggle("previewDropTarget--active", active);
}

previewDropTarget?.addEventListener("dragenter", (e) => {
  e.preventDefault();
  const related = /** @type {Node | null} */ (e.relatedTarget);
  if (!related || !previewDropTarget.contains(related)) {
    setPreviewDragActive(true);
  }
});

previewDropTarget?.addEventListener("dragleave", (e) => {
  const related = /** @type {Node | null} */ (e.relatedTarget);
  if (!related || !previewDropTarget.contains(related)) {
    setPreviewDragActive(false);
  }
});

previewDropTarget?.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
});

previewDropTarget?.addEventListener("drop", (e) => {
  e.preventDefault();
  setPreviewDragActive(false);
  const file = e.dataTransfer.files?.[0];
  if (!file) return;
  applyImageFile(file);
});

textLine1.addEventListener("input", () => {
  state.line1 = textLine1.value ?? "";
  redraw();
});

textLine2.addEventListener("input", () => {
  state.line2 = textLine2.value ?? "";
  redraw();
});

fontFamilySelect.addEventListener("change", () => {
  redraw();
});

fontSize1Input.addEventListener("input", () => {
  const next = Number(fontSize1Input.value);
  state.fontSize1 = Number.isFinite(next) ? next : 48;
  fontSize1Value.textContent = String(state.fontSize1);
  if (state.image) clampAllAnchors();
  redraw();
});

fontSize2Input.addEventListener("input", () => {
  const next = Number(fontSize2Input.value);
  state.fontSize2 = Number.isFinite(next) ? next : 48;
  fontSize2Value.textContent = String(state.fontSize2);
  if (state.image) clampAllAnchors();
  redraw();
});

angle1Input.addEventListener("input", () => {
  const next = Number(angle1Input.value);
  state.angle1Deg = Number.isFinite(next) ? next : 0;
  angle1Value.textContent = String(state.angle1Deg);
  redraw();
});

angle2Input.addEventListener("input", () => {
  const next = Number(angle2Input.value);
  state.angle2Deg = Number.isFinite(next) ? next : 0;
  angle2Value.textContent = String(state.angle2Deg);
  redraw();
});

document.querySelectorAll('input[name="stroke"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    state.strokeColor = getSelectedStrokeColor();
    redraw();
  });
});

removeBgBtn?.addEventListener("click", async () => {
  if (!state.image || state.removingBg) return;
  state.removingBg = true;
  removeBgBtn.disabled = true;
  downloadBtn.disabled = true;
  try {
    setHint("正在抠除背景（首次会下载模型，请稍候）…");
    const { removeSubjectBackground } = await import("./removeBg.js");
    const blob = await removeSubjectBackground(state.image, (key, current, total) => {
      setHint(`抠图进行中：${key}（${current}/${total}）`);
    });
    const img = await loadImageFromBlob(blob);
    state.image = img;
    fitCanvasToImage(img);
    setHint("背景已移除。可继续编辑文本并导出 PNG。");
    redraw();
  } catch (err) {
    console.error(err);
    setHint("抠图失败：请检查网络（需访问 jsDelivr）或换一张图后重试。");
  } finally {
    state.removingBg = false;
    syncRemoveBgButton();
    if (state.image) {
      downloadBtn.disabled = false;
    }
  }
});

function onPointerDown(e) {
  if (!state.image || state.removingBg) return;
  const { x, y } = canvasCoordsFromEvent(e);

  const line = pickLineAtPoint({
    canvas,
    ctx,
    line1: state.line1,
    line2: state.line2,
    fontSize1: state.fontSize1,
    fontSize2: state.fontSize2,
    angle1Deg: state.angle1Deg,
    angle2Deg: state.angle2Deg,
    anchor1X: state.anchor1X ?? undefined,
    anchor1Y: state.anchor1Y ?? undefined,
    anchor2X: state.anchor2X ?? undefined,
    anchor2Y: state.anchor2Y ?? undefined,
    px: x,
    py: y,
    fontFamily: getFontFamilyCss(),
  });

  if (!line) return;
  e.preventDefault();

  const p1 = effectiveAnchor1();
  const p2 = effectiveAnchor2();
  const ax = line === 1 ? p1.x : p2.x;
  const ay = line === 1 ? p1.y : p2.y;

  state.isDragging = true;
  state.draggingLine = line;
  state.dragOffsetX = x - ax;
  state.dragOffsetY = y - ay;

  if (line === 1) {
    state.anchor1X = p1.x;
    state.anchor1Y = p1.y;
  } else {
    state.anchor2X = p2.x;
    state.anchor2Y = p2.y;
  }
}

function onPointerMove(e) {
  if (!state.isDragging || !state.image || state.draggingLine === 0) return;
  e.preventDefault();
  const { x, y } = canvasCoordsFromEvent(e);
  const nx = x - state.dragOffsetX;
  const ny = y - state.dragOffsetY;
  const c = clampPair(nx, ny);
  if (state.draggingLine === 1) {
    state.anchor1X = c.x;
    state.anchor1Y = c.y;
  } else {
    state.anchor2X = c.x;
    state.anchor2Y = c.y;
  }
  redraw();
}

function onPointerUp() {
  state.isDragging = false;
  state.draggingLine = 0;
}

canvas.addEventListener("mousedown", onPointerDown);
window.addEventListener("mousemove", onPointerMove);
window.addEventListener("mouseup", onPointerUp);

canvas.addEventListener(
  "touchstart",
  (e) => {
    onPointerDown(e);
  },
  { passive: false },
);
window.addEventListener(
  "touchmove",
  (e) => {
    onPointerMove(e);
  },
  { passive: false },
);
window.addEventListener("touchend", onPointerUp);
window.addEventListener("touchcancel", onPointerUp);

downloadBtn.addEventListener("click", () => {
  if (!state.image) return;

  const safeName = "meme.png";

  if (canvas.toBlob) {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, "image/png");
    return;
  }

  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  a.remove();
});

state.strokeColor = getSelectedStrokeColor();
fontSize1Value.textContent = String(state.fontSize1);
fontSize2Value.textContent = String(state.fontSize2);
angle1Value.textContent = String(state.angle1Deg);
angle2Value.textContent = String(state.angle2Deg);
setDownloadEnabled(false);
syncRemoveBgButton();
setHint("请先选择或拖入底图。在预览中点选文本后可拖动调整位置。");
redraw();
