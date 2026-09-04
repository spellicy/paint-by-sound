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

const renoir: StyleRenderer = ({ ctx, cursor, note, color, rand }) => {
  // Full, round, warm dabs -- dappled light, fuller and softer than Monet's
  // short strokes.
  const r = 5 + note.amplitude * 20;
  ctx.save();
  ctx.filter = "blur(1.4px)";
  ctx.fillStyle = color.rgba(0.45 + rand() * 0.3);
  ctx.beginPath();
  ctx.ellipse(
    cursor.x,
    cursor.y,
    r * (0.85 + rand() * 0.5),
    r * (0.7 + rand() * 0.45),
    rand() * TAU,
    0,
    TAU,
  );
  ctx.fill();
  ctx.restore();
};

const monet: StyleRenderer = ({ ctx, cursor, note, color, rand }) => {
  // Short broken-color brush strokes, occasionally paired with a small
  // complementary fleck placed nearby -- impressionist juxtaposition
  // creating shimmer at a distance rather than one blended hue.
  const len = 4 + note.amplitude * 16;
  const thickness = 1.5 + note.amplitude * 5;
  const angle = rand() * Math.PI;
  ctx.save();
  ctx.filter = "blur(0.7px)";
  ctx.strokeStyle = color.rgba(0.5 + rand() * 0.3);
  ctx.lineWidth = thickness;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cursor.x - Math.cos(angle) * len * 0.5, cursor.y - Math.sin(angle) * len * 0.5);
  ctx.lineTo(cursor.x + Math.cos(angle) * len * 0.5, cursor.y + Math.sin(angle) * len * 0.5);
  ctx.stroke();

  if (rand() < 0.3) {
    const compHue = (color.hue + 180) % 360;
    ctx.fillStyle = `hsla(${compHue.toFixed(1)}, ${color.saturation.toFixed(0)}%, ${Math.min(90, color.lightness + 8).toFixed(0)}%, 0.3)`;
    ctx.beginPath();
    ctx.arc(cursor.x + (rand() - 0.5) * 12, cursor.y + (rand() - 0.5) * 12, 1.2 + rand() * 2, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
};

const CEZANNE_ANGLES = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4];

const cezanne: StyleRenderer = ({ ctx, cursor, note, color, rand }) => {
  // The "constructive stroke": small parallel rectangular hatches at one of
  // a handful of fixed angles, several per patch -- planes built up from
  // repeated directional marks rather than outlines or blended fills.
  const angle = CEZANNE_ANGLES[Math.floor(rand() * CEZANNE_ANGLES.length)];
  const count = 3 + Math.floor(rand() * 3);
  const len = 8 + note.amplitude * 22;
  const w = 2 + note.amplitude * 3;
  ctx.save();
  ctx.translate(cursor.x, cursor.y);
  ctx.rotate(angle + (rand() - 0.5) * 0.08);
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * (w + 1.5);
    ctx.fillStyle = color.rgba(0.5 + rand() * 0.35);
    ctx.fillRect(-len / 2, offset - w / 2, len, w);
  }
  ctx.restore();
};

const dali: StyleRenderer = ({ ctx, cursor, note, color, rand }) => {
  // A smooth, softly-shaded droop -- evoking a melting form -- with a
  // long, faint cast shadow. Precise and isolated rather than textured or
  // overlapping, the way Dali rendered a few uncanny objects with great
  // technical finish against a mostly empty landscape.
  const w = 16 + note.amplitude * 44;
  const droop = 26 + note.amplitude * 64 + rand() * 18;
  ctx.save();
  ctx.translate(cursor.x, cursor.y);

  const shadowAngle = -0.35 + rand() * 0.2;
  ctx.fillStyle = `hsla(${color.hue.toFixed(1)}, 12%, 10%, 0.22)`;
  ctx.beginPath();
  ctx.ellipse(
    Math.cos(shadowAngle) * w * 1.4,
    droop * 0.35,
    w * 1.9,
    w * 0.22,
    shadowAngle,
    0,
    TAU,
  );
  ctx.fill();

  const grad = ctx.createLinearGradient(0, -w / 2, 0, droop);
  grad.addColorStop(0, color.rgba(0.92));
  grad.addColorStop(
    1,
    `hsla(${color.hue.toFixed(1)}, ${color.saturation.toFixed(0)}%, ${Math.max(8, color.lightness - 26).toFixed(0)}%, 0.88)`,
  );
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.quadraticCurveTo(-w / 2, w * 0.6, 0, droop);
  ctx.quadraticCurveTo(w / 2, w * 0.6, w / 2, 0);
  ctx.quadraticCurveTo(w / 2, -w * 0.55, 0, -w * 0.6);
  ctx.quadraticCurveTo(-w / 2, -w * 0.55, -w / 2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const vangogh: StyleRenderer = ({ ctx, cursor, note, color, rand, heading }) => {
  // Thick, curved impasto strokes laid tangent to the arm's direction of
  // travel -- several offset copies build visible ridges of paint, the way
  // Van Gogh's short, loaded strokes read as physical texture rather than
  // flat color. An occasional hot complementary fleck echoes his contrast.
  const dir = heading ?? rand() * TAU;
  const len = 10 + note.amplitude * 26;
  const curve = (rand() - 0.5) * len * 0.9;
  const layers = 2 + Math.floor(rand() * 2);

  ctx.save();
  ctx.translate(cursor.x, cursor.y);
  ctx.rotate(dir);
  ctx.lineCap = "round";
  for (let i = 0; i < layers; i++) {
    const off = (i - (layers - 1) / 2) * (1.5 + note.amplitude * 1.5);
    ctx.strokeStyle = color.rgba(0.5 + rand() * 0.4);
    ctx.lineWidth = 1.5 + note.amplitude * 4 - i * 0.6;
    ctx.beginPath();
    ctx.moveTo(-len / 2, off);
    ctx.quadraticCurveTo(0, off + curve, len / 2, off);
    ctx.stroke();
  }
  if (rand() < 0.25) {
    const compHue = (color.hue + 180) % 360;
    ctx.fillStyle = `hsla(${compHue.toFixed(1)}, ${Math.min(95, color.saturation + 10).toFixed(0)}%, ${color.lightness.toFixed(0)}%, 0.5)`;
    ctx.beginPath();
    ctx.arc(len * 0.3, curve * 0.4, 1.5 + note.amplitude * 2, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
};

const STYLE_RENDERERS: Record<PaintStyleId, StyleRenderer> = {
  kandinsky,
  klee,
  pollock,
  picasso,
  // Rothko is rendered directly by PaintEngine.renderRothkoField (its
  // field-based technique doesn't fit the single-point StrokeContext
  // shape); this entry exists only to satisfy the exhaustive style map and
  // is never invoked in normal operation.
  rothko: renoir,
  renoir,
  monet,
  cezanne,
  dali,
  vangogh,
};

export function renderStroke(styleId: PaintStyleId, s: StrokeContext) {
  STYLE_RENDERERS[styleId](s);
}
