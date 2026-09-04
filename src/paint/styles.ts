import type { PaintStyleId, StrokeContext, StyleRenderer } from "./types";

const TAU = Math.PI * 2;

const kandinsky: StyleRenderer = ({ ctx, cursor, note, color, rand }) => {
  const radius = 6 + note.amplitude * 46;
  ctx.save();
  ctx.translate(cursor.x, cursor.y);
  ctx.rotate(rand() * TAU);

  if (note.isOnset && rand() > 0.55) {
    // A stacked ring -- Kandinsky's concentric circles motif.
    ctx.strokeStyle = color.rgba(0.85);
    ctx.lineWidth = 2 + note.amplitude * 4;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = color.rgba(0.5);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.55, 0, TAU);
    ctx.stroke();
  } else if (rand() > 0.4) {
    ctx.fillStyle = color.rgba(0.8);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.5, 0, TAU);
    ctx.fill();
  } else {
    ctx.strokeStyle = color.rgba(0.75);
    ctx.lineWidth = 2 + note.amplitude * 8;
    ctx.beginPath();
    ctx.moveTo(-radius, 0);
    ctx.lineTo(radius, 0);
    ctx.stroke();
  }
  ctx.restore();
};

const klee: StyleRenderer = ({ ctx, cursor, note, color, rand }) => {
  const size = 4 + note.amplitude * 18;
  ctx.save();
  ctx.translate(cursor.x, cursor.y);
  ctx.rotate((rand() - 0.5) * 0.6);
  ctx.fillStyle = color.rgba(0.75);
  ctx.strokeStyle = color.rgba(0.9);
  ctx.lineWidth = 1;

  if (rand() > 0.5) {
    ctx.beginPath();
    ctx.rect(-size / 2, -size / 2, size, size);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
};

const pollock: StyleRenderer = ({ ctx, cursor, note, color, rand }) => {
  const flingDistance = 10 + note.amplitude * 90;
  const dropCount = note.isOnset ? 6 + Math.floor(note.amplitude * 10) : 2;

  ctx.save();
  ctx.strokeStyle = color.rgba(0.7);
  ctx.lineWidth = 0.6 + note.amplitude * 2.2;
  ctx.beginPath();
  ctx.moveTo(cursor.x, cursor.y);
  const angle = rand() * TAU;
  const endX = cursor.x + Math.cos(angle) * flingDistance;
  const endY = cursor.y + Math.sin(angle) * flingDistance;
  ctx.quadraticCurveTo(
    cursor.x + Math.cos(angle + 0.6) * flingDistance * 0.5,
    cursor.y + Math.sin(angle + 0.6) * flingDistance * 0.5,
    endX,
    endY,
  );
  ctx.stroke();

  ctx.fillStyle = color.rgba(0.6);
  for (let i = 0; i < dropCount; i++) {
    const t = rand();
    const px = cursor.x + (endX - cursor.x) * t + (rand() - 0.5) * 14;
    const py = cursor.y + (endY - cursor.y) * t + (rand() - 0.5) * 14;
    const r = 0.5 + rand() * (1.5 + note.amplitude * 3);
    ctx.beginPath();
    ctx.arc(px, py, r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
};

const picasso: StyleRenderer = ({ ctx, cursor, note, color, rand }) => {
  const size = 10 + note.amplitude * 55;
  const sides = 3 + Math.floor(rand() * 3);
  ctx.save();
  ctx.translate(cursor.x, cursor.y);
  ctx.rotate(rand() * TAU);
  ctx.fillStyle = color.rgba(0.55);
  ctx.strokeStyle = color.rgba(0.9);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * TAU;
    const r = size * (0.6 + rand() * 0.8);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

const STYLE_RENDERERS: Record<PaintStyleId, StyleRenderer> = {
  kandinsky,
  klee,
  pollock,
  picasso,
};

export function renderStroke(styleId: PaintStyleId, s: StrokeContext) {
  STYLE_RENDERERS[styleId](s);
}
