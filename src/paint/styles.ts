import type { PaintStyleId, StrokeContext, StyleRenderer } from "./types";

const TAU = Math.PI * 2;

// Rothko is rendered directly by PaintEngine.renderRothkoField (its
// field-based technique doesn't fit the single-point StrokeContext shape);
// this entry exists only to satisfy the exhaustive style map and is never
// invoked in normal operation.
const rothko: StyleRenderer = () => {};

const pollock: StyleRenderer = ({ ctx, cursor, note, color, rand }) => {
  // A single dripped/flung filament -- a thin, looping, multi-segment
  // thread laid down in one continuous gesture, tapering as it goes, the
  // way paint trailed off a loaded stick or brush through the air. A
  // single smooth arc reads as a deliberate brushstroke; the looping
  // elbows here are what make it read as *flung* rather than painted.
  const reach = 12 + note.amplitude * 70;
  const segments = 2 + Math.floor(rand() * 2);
  const flickCount = note.isOnset ? 3 + Math.floor(note.amplitude * 6) : 1;

  ctx.save();
  ctx.strokeStyle = color.rgba(0.6 + rand() * 0.2);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cursor.x, cursor.y);
  let px = cursor.x;
  let py = cursor.y;
  let heading = rand() * TAU;
  for (let i = 0; i < segments; i++) {
    heading += (rand() - 0.5) * 2.6;
    const segLen = (reach / segments) * (0.6 + rand() * 0.8);
    const nx = px + Math.cos(heading) * segLen;
    const ny = py + Math.sin(heading) * segLen;
    const cx = px + Math.cos(heading - 0.6) * segLen * 0.5;
    const cy = py + Math.sin(heading - 0.6) * segLen * 0.5;
    // Tapers toward the tail, the way a dripped line thins as it runs out.
    ctx.lineWidth = Math.max(0.4, (0.5 + note.amplitude * 1.6) * (1 - i / (segments + 1)));
    ctx.quadraticCurveTo(cx, cy, nx, ny);
    px = nx;
    py = ny;
  }
  ctx.stroke();

  // Fine spatter flecks where the loaded stick broke contact -- small and
  // sparse, never a filled blob.
  ctx.fillStyle = color.rgba(0.5);
  for (let i = 0; i < flickCount; i++) {
    const t = rand();
    const fx = cursor.x + (px - cursor.x) * t + (rand() - 0.5) * 10;
    const fy = cursor.y + (py - cursor.y) * t + (rand() - 0.5) * 10;
    const r = 0.4 + rand() * (0.5 + note.amplitude * 1.2);
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
};

const dekooning: StyleRenderer = ({ ctx, cursor, note, color, rand }) => {
  // The Woman-series attack: color rarely goes down as one clean stroke --
  // two or three slashing passes pile up in different directions, fighting
  // each other, before a loose black contour line loops across the whole
  // thing independently (his outline famously "continues in loops and
  // streaks and drips, taking on a life of its own"), and a palette-knife
  // scrape tears back through wherever paint was applied and dragged away.
  const len = 14 + note.amplitude * 60;
  const width = 3 + note.amplitude * 14;

  ctx.save();
  ctx.translate(cursor.x, cursor.y);
  ctx.lineCap = "round";

  const passes = rand() < 0.4 ? 3 : 2;
  for (let i = 0; i < passes; i++) {
    const angle = (rand() - 0.5) * Math.PI * 1.1 - Math.PI / 4;
    const passLen = len * (0.55 + rand() * 0.6);
    const passWidth = width * (0.5 + rand() * 0.7);
    ctx.save();
    ctx.rotate(angle);
    ctx.strokeStyle = color.rgba(0.5 + rand() * 0.35);
    ctx.lineWidth = passWidth;
    ctx.beginPath();
    ctx.moveTo(-passLen / 2, (rand() - 0.5) * passWidth);
    ctx.quadraticCurveTo(
      (rand() - 0.5) * passLen * 0.5,
      (rand() - 0.5) * passWidth * 2,
      passLen / 2,
      (rand() - 0.5) * passWidth,
    );
    ctx.stroke();
    ctx.restore();
  }

  if (rand() < 0.65) {
    // The signature black contour: a loose, independent looping line laid
    // over the color passes, tapering thin-to-thick and occasionally
    // trailing a short drip off its tail.
    const lineAngle = rand() * TAU;
    const loopLen = len * (0.7 + rand() * 0.5);
    ctx.save();
    ctx.rotate(lineAngle);
    ctx.strokeStyle = `rgba(18, 15, 13, ${(0.55 + rand() * 0.3).toFixed(2)})`;
    ctx.lineWidth = 1 + note.amplitude * 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(loopLen * 0.3, -loopLen * 0.4, loopLen * 0.6, loopLen * 0.15);
    ctx.quadraticCurveTo(loopLen * 0.75, loopLen * 0.4, loopLen * 0.5, loopLen * 0.55);
    ctx.stroke();
    if (rand() < 0.4) {
      ctx.beginPath();
      ctx.moveTo(loopLen * 0.5, loopLen * 0.55);
      ctx.lineTo(loopLen * 0.5 + (rand() - 0.5) * 3, loopLen * 0.55 + 4 + rand() * 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (rand() < 0.5) {
    // A scraped patch -- palette-knife texture where color was applied
    // and dragged away rather than smoothly blended.
    ctx.fillStyle = rand() < 0.5 ? "rgba(20, 16, 14, 0.4)" : "rgba(250, 246, 238, 0.35)";
    ctx.beginPath();
    ctx.moveTo(-len * 0.2, -width);
    ctx.lineTo(len * 0.25, -width * 0.3);
    ctx.lineTo(len * 0.15, width * 0.7);
    ctx.lineTo(-len * 0.1, width * 0.9);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
};

const KLINE_ANGLES = [0, Math.PI / 2, Math.PI / 6, -Math.PI / 5];

const kline: StyleRenderer = ({ ctx, cursor, note, color, rand }) => {
  // A few massive, hard-edged bars -- almost always the palette's near-
  // black/near-white extremes, laid down with total commitment and no
  // blur or blending, the way Kline built a composition from a handful of
  // architectural strokes rather than accumulated small marks.
  const len = 40 + note.amplitude * 140;
  const w = 8 + note.amplitude * 26;
  const angle = KLINE_ANGLES[Math.floor(rand() * KLINE_ANGLES.length)];
  const isAccent = rand() < 0.08;

  ctx.save();
  ctx.translate(cursor.x, cursor.y);
  ctx.rotate(angle + (rand() - 0.5) * 0.15);
  ctx.lineCap = "square";
  ctx.strokeStyle = isAccent
    ? `hsla(${color.hue.toFixed(1)}, 70%, 45%, 0.85)`
    : color.rgba(0.92);
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(-len / 2, 0);
  ctx.lineTo(len / 2, 0);
  ctx.stroke();
  ctx.restore();
};

const kelly: StyleRenderer = ({ ctx, cursor, note, color, rand }) => {
  // A single flat, hard-edged shape in one pure color -- no blur, no
  // gradient, no overlapping texture -- the crisp confident forms of
  // Kelly's color-panel language.
  const size = 16 + note.amplitude * 70;
  const shape = Math.floor(rand() * 3);
  ctx.save();
  ctx.translate(cursor.x, cursor.y);
  ctx.rotate(Math.floor(rand() * 4) * (Math.PI / 2));
  ctx.fillStyle = color.rgba(0.95);
  ctx.beginPath();
  if (shape === 0) {
    ctx.rect(-size / 2, -size / 2, size, size * (0.5 + rand() * 0.6));
  } else if (shape === 1) {
    ctx.arc(0, 0, size / 2, 0, TAU);
  } else {
    // A curved panel edge -- a lens shape rather than a full circle,
    // echoing his shaped canvases.
    ctx.moveTo(-size / 2, size / 2);
    ctx.quadraticCurveTo(0, -size * 0.9, size / 2, size / 2);
    ctx.closePath();
  }
  ctx.fill();
  ctx.restore();
};

const martin: StyleRenderer = ({ ctx, cursor, note, color, rand }) => {
  // A single fine, restrained horizontal line -- pale, hand-ruled, barely
  // varying -- the quiet grids built from thousands of nearly identical
  // marks rather than any one gesture standing out.
  const len = 30 + note.amplitude * 40;
  ctx.save();
  ctx.strokeStyle = color.rgba(0.35 + note.amplitude * 0.25);
  ctx.lineWidth = 0.6 + note.amplitude * 0.8;
  ctx.beginPath();
  ctx.moveTo(cursor.x - len / 2, cursor.y);
  ctx.lineTo(cursor.x + len / 2, cursor.y + (rand() - 0.5) * 1.2);
  ctx.stroke();

  if (note.isOnset && rand() < 0.3) {
    // An occasional faint vertical tick -- the grid's other axis.
    ctx.strokeStyle = color.rgba(0.2);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cursor.x, cursor.y - 5);
    ctx.lineTo(cursor.x, cursor.y + 5);
    ctx.stroke();
  }
  ctx.restore();
};

const marden: StyleRenderer = ({ ctx, cursor, note, color, rand, heading }) => {
  // One smooth, unhurried curve laid tangent to the arm's long, gentle
  // sweep -- the sinuous continuous line of the later "Cold Mountain"
  // work, built up in a couple of translucent passes rather than many
  // small marks.
  const dir = heading ?? rand() * TAU;
  const len = 16 + note.amplitude * 34;
  const curve = (rand() - 0.5) * len * 0.5;
  const passes = 2;

  ctx.save();
  ctx.translate(cursor.x, cursor.y);
  ctx.rotate(dir);
  ctx.lineCap = "round";
  for (let i = 0; i < passes; i++) {
    ctx.strokeStyle = color.rgba(0.28 + note.amplitude * 0.2);
    ctx.lineWidth = 3 + note.amplitude * 6 - i * 1.2;
    ctx.beginPath();
    ctx.moveTo(-len / 2, 0);
    ctx.quadraticCurveTo(0, curve, len / 2, 0);
    ctx.stroke();
  }
  ctx.restore();
};

const STYLE_RENDERERS: Record<PaintStyleId, StyleRenderer> = {
  rothko,
  pollock,
  dekooning,
  kline,
  kelly,
  martin,
  marden,
};

export function renderStroke(styleId: PaintStyleId, s: StrokeContext) {
  STYLE_RENDERERS[styleId](s);
}
