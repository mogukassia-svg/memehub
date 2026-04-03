function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} ax
 * @param {number} ay
 * @param {number} angleRad
 * @param {number} fontSize
 * @param {string} strokeColor
 * @param {string} fontFamily
 */
function drawOutlinedRotated(
  ctx,
  text,
  ax,
  ay,
  angleRad,
  fontSize,
  strokeColor,
  fontFamily,
) {
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(angleRad);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = Math.max(2, Math.round(fontSize / 8));
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = "#fff";
  ctx.strokeText(text, 0, 0);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

const DEFAULT_ANCHOR1_Y_RATIO = 0.14;
const DEFAULT_ANCHOR2_Y_RATIO = 0.82;

function defaultAnchor1(canvas) {
  return { x: canvas.width / 2, y: canvas.height * DEFAULT_ANCHOR1_Y_RATIO };
}

function defaultAnchor2(canvas) {
  return { x: canvas.width / 2, y: canvas.height * DEFAULT_ANCHOR2_Y_RATIO };
}

/**
 * 判断点击落在哪一行文字上（1 或 2）。考虑旋转后的包围盒。
 */
export function pickLineAtPoint({
  canvas,
  ctx,
  line1,
  line2,
  fontSize1,
  fontSize2,
  angle1Deg = 0,
  angle2Deg = 0,
  anchor1X,
  anchor1Y,
  anchor2X,
  anchor2Y,
  px,
  py,
  fontFamily,
}) {
  const t1 = (line1 ?? "").trim();
  const t2 = (line2 ?? "").trim();
  if (!t1 && !t2) return null;

  const d1 = defaultAnchor1(canvas);
  const d2 = defaultAnchor2(canvas);
  const a1x = typeof anchor1X === "number" && Number.isFinite(anchor1X) ? anchor1X : d1.x;
  const a1y = typeof anchor1Y === "number" && Number.isFinite(anchor1Y) ? anchor1Y : d1.y;
  const a2x = typeof anchor2X === "number" && Number.isFinite(anchor2X) ? anchor2X : d2.x;
  const a2y = typeof anchor2Y === "number" && Number.isFinite(anchor2Y) ? anchor2Y : d2.y;

  const r1 = degToRad(angle1Deg);
  const r2 = degToRad(angle2Deg);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  function hitRotated(text, fontSize, ax, ay, angleRad) {
    ctx.font = `${fontSize}px ${fontFamily}`;
    const w = ctx.measureText(text).width;
    const h = fontSize * 1.2;
    const lw = Math.max(2, Math.round(fontSize / 8));
    const pad = lw + fontSize * 0.28;
    const dx = px - ax;
    const dy = py - ay;
    const c = Math.cos(-angleRad);
    const s = Math.sin(-angleRad);
    const lx = dx * c - dy * s;
    const ly = dx * s + dy * c;
    return (
      lx >= -w / 2 - pad &&
      lx <= w / 2 + pad &&
      ly >= -h / 2 - pad &&
      ly <= h / 2 + pad
    );
  }

  /** @type {{ line: 1 | 2; dist: number }[]} */
  const hits = [];
  if (t1 && hitRotated(t1, fontSize1, a1x, a1y, r1)) {
    hits.push({ line: 1, dist: Math.hypot(px - a1x, py - a1y) });
  }
  if (t2 && hitRotated(t2, fontSize2, a2x, a2y, r2)) {
    hits.push({ line: 2, dist: Math.hypot(px - a2x, py - a2y) });
  }
  ctx.restore();

  if (hits.length === 0) return null;
  hits.sort((a, b) => a.dist - b.dist);
  return hits[0].line;
}

/**
 * @param {object} opts
 * @param {CanvasRenderingContext2D} opts.ctx
 * @param {HTMLCanvasElement} opts.canvas
 * @param {HTMLImageElement | null} opts.image
 */
export function drawMeme({
  ctx,
  canvas,
  image,
  line1,
  line2,
  fontSize1 = 48,
  fontSize2 = 48,
  angle1Deg = 0,
  angle2Deg = 0,
  strokeColor = "#000000",
  anchor1X,
  anchor1Y,
  anchor2X,
  anchor2Y,
  fontFamily,
}) {
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (image) {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.save();
    ctx.fillStyle = "#ebe6f2";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#6b6574";
    ctx.font =
      '15px "Noto Sans SC", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("请先选择底图", canvas.width / 2, canvas.height / 2);
    ctx.restore();
    return;
  }

  const t1 = (line1 ?? "").trim();
  const t2 = (line2 ?? "").trim();
  if (!t1 && !t2) return;

  const d1 = defaultAnchor1(canvas);
  const d2 = defaultAnchor2(canvas);
  const x1 =
    typeof anchor1X === "number" && Number.isFinite(anchor1X) ? anchor1X : d1.x;
  const y1 =
    typeof anchor1Y === "number" && Number.isFinite(anchor1Y) ? anchor1Y : d1.y;
  const x2 =
    typeof anchor2X === "number" && Number.isFinite(anchor2X) ? anchor2X : d2.x;
  const y2 =
    typeof anchor2Y === "number" && Number.isFinite(anchor2Y) ? anchor2Y : d2.y;

  const r1 = degToRad(angle1Deg);
  const r2 = degToRad(angle2Deg);

  if (t1) {
    drawOutlinedRotated(ctx, t1, x1, y1, r1, fontSize1, strokeColor, fontFamily);
  }
  if (t2) {
    drawOutlinedRotated(ctx, t2, x2, y2, r2, fontSize2, strokeColor, fontFamily);
  }
}
