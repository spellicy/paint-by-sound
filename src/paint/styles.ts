import type { PaintStyleId, StrokeContext, StyleRenderer } from "./types";

const TAU = Math.PI * 2;

// Rothko is rendered directly by PaintEngine.renderRothkoField (its
// field-based technique doesn't fit the single-point StrokeContext shape);
// this entry exists only to satisfy the exhaustive style map and is never
// invoked in normal operation.
const rothko: StyleRenderer = () => {};

// Louis (parallel vertical color stripes) is likewise rendered directly by
// PaintEngine.renderLouisStripe, which needs a persistent stripe -> hue
// mapping that doesn't fit the single-point StrokeContext shape either.
const louis: StyleRenderer = () => {};

const pollock: StyleRenderer = ({ ctx, cursor, note, color, rand }) => {
  // A dripped/flung filament with genuinely variable width -- thick where
  // the loaded stick dumped extra paint, thin where it ran dry, rather
  // than one smooth taper -- plus, sometimes, a pooled blob where paint
  // gathered instead of running, and occasionally a wide, chaotic spray
  // burst well past the line itself. Real flung paint is never one
  // uniform-width line; it varies constantly along its own length.
  // Length varies well beyond what amplitude alone would give -- a short
  // stub or a long trailing thread, not a fairly narrow band around one
  // typical size every time.
  const reachJitter = rand() < 0.15 ? 0.3 + rand() * 0.4 : 0.7 + rand() * 1.7;
  const reach = (12 + note.amplitude * 70) * reachJitter;
  const segments = 2 + Math.floor(rand() * 3);
  const baseWidth = 0.5 + note.amplitude * 1.8;
  // A longer stroke (more segments) needs to visibly taper along its own
  // length, not just vary at random from one note's mark to the next --
  // real flung paint runs thick where the stick made contact and thins as
  // it trails off (or the reverse, building toward a stopping blot).
  // How MUCH the width swings around that taper -- rather than following
  // it smoothly -- is driven by the note's timbre: a bright/harsh sound
  // gets a rougher, more erratic line; a dull/warm one stays closer to a
  // clean taper. Whether the thick end lands at the start or the tail
  // leans toward "start" on an onset (the moment of impact) and is a
  // toss-up otherwise.
  const jitterAmount = 0.22 + note.brightness * 1.1;
  const thickAtStart = note.isOnset ? rand() < 0.75 : rand() < 0.5;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Lay down the raw waypoints of a whip-like walk first, heading drifting
  // smoothly with only occasional sharper flicks -- then render them as one
  // continuous curve (below), rather than each segment being its own
  // independently-bowed arc. Bowing every segment the same fixed amount
  // relative to its own heading, with no relation to the segment before or
  // after it, is what made the line read as a chain of separate crescents
  // meeting at corners instead of one fluid stroke.
  const pts: { x: number; y: number }[] = [{ x: cursor.x, y: cursor.y }];
  let heading = rand() * TAU;
  for (let i = 0; i < segments; i++) {
    heading += (rand() - 0.5) * (rand() < 0.15 ? 2.0 : 0.85);
    const segLen = (reach / segments) * (0.6 + rand() * 0.8);
    const prev = pts[i];
    pts.push({ x: prev.x + Math.cos(heading) * segLen, y: prev.y + Math.sin(heading) * segLen });
  }

  // Each piece curves toward the *next* raw waypoint but stops short, at
  // the midpoint between that waypoint and the one after it -- the
  // standard trick for turning a jagged polyline into one smooth curve.
  // Because each piece starts exactly where the previous one's curve
  // ended, the tangent is continuous at every join: the whole stroke reads
  // as one fluid line, not a chain of separately-bowed arcs meeting at
  // corners. Still stroked piece by piece (not as one path) so each can
  // carry its own width.
  let curX = pts[0].x;
  let curY = pts[0].y;
  for (let i = 0; i < segments; i++) {
    const ctrl = pts[i + 1];
    const isLast = i === segments - 1;
    const targetX = isLast ? pts[segments].x : (pts[i + 1].x + pts[i + 2].x) / 2;
    const targetY = isLast ? pts[segments].y : (pts[i + 1].y + pts[i + 2].y) / 2;

    const t = i / Math.max(1, segments - 1);
    const taper = thickAtStart ? 1 - t * 0.7 : 0.3 + t * 0.7;
    const noise = 1 + (rand() - 0.5) * jitterAmount;
    ctx.lineWidth = Math.max(0.3, baseWidth * taper * noise);
    ctx.strokeStyle = color.rgba(0.5 + rand() * 0.35);
    ctx.beginPath();
    ctx.moveTo(curX, curY);
    ctx.quadraticCurveTo(ctrl.x, ctrl.y, targetX, targetY);
    ctx.stroke();
    curX = targetX;
    curY = targetY;
  }
  let px = curX;
  let py = curY;

  // Occasionally the stick dumped extra paint mid-gesture -- a small
  // pooled blob (an irregular, lobed splotch, not a perfect circle)
  // rather than a continuous line.
  if (rand() < 0.22) {
    const bx = cursor.x + (px - cursor.x) * rand();
    const by = cursor.y + (py - cursor.y) * rand();
    const br = 1.5 + rand() * (2 + note.amplitude * 5);
    const lobes = 5 + Math.floor(rand() * 3);
    ctx.fillStyle = color.rgba(0.45 + rand() * 0.3);
    ctx.beginPath();
    for (let i = 0; i < lobes; i++) {
      const a = (i / lobes) * TAU;
      const r = br * (0.6 + rand() * 0.7);
      const x = bx + Math.cos(a) * r;
      const y = by + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Fine spatter flecks where the loaded stick broke contact -- usually
  // small and sparse, but sometimes (a real fling) a much wider, more
  // chaotic scatter flung well past the line itself.
  const isBigSpray = rand() < 0.15;
  const flickCount = note.isOnset
    ? (isBigSpray ? 8 : 3) + Math.floor(note.amplitude * (isBigSpray ? 14 : 6))
    : isBigSpray
      ? 4 + Math.floor(rand() * 5)
      : 1;
  const spreadRadius = isBigSpray ? 14 + note.amplitude * 30 : 10;
  ctx.fillStyle = color.rgba(0.5);
  for (let i = 0; i < flickCount; i++) {
    const t = rand();
    const fx = cursor.x + (px - cursor.x) * t + (rand() - 0.5) * spreadRadius;
    const fy = cursor.y + (py - cursor.y) * t + (rand() - 0.5) * spreadRadius;
    // rand()*rand() skews toward small drops with an occasional larger
    // splat, the way real spatter distributes -- mostly fine, rarely fat.
    const r = 0.4 + rand() * rand() * (isBigSpray ? 3.5 : 1.2) * (0.5 + note.amplitude);
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
    // Full 360 degrees, not a range centered on one diagonal -- real
    // slashes attack from every direction, and a shared bias across every
    // mark is part of what read as too orderly/directional.
    const angle = rand() * TAU;
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

const schiele: StyleRenderer = ({ ctx, cursor, note, color, rand }) => {
  // A sharp, nervous contour -- angular segments with sudden elbow-like
  // direction changes rather than a fluid curve, the way a figure got
  // built from a few confident, searching pencil/ink strokes. Color
  // never fills the shape evenly: a dense band hugs the line and thins
  // to a veil moving inward, most of the canvas left bare -- his sparse
  // backgrounds push all the pressure onto the contour itself.
  const len = 10 + note.amplitude * 46;
  const segments = 3 + Math.floor(rand() * 3);
  const inkWidth = 0.8 + note.amplitude * 1.4;

  ctx.save();
  ctx.translate(cursor.x, cursor.y);
  ctx.rotate(rand() * TAU);

  const points: { x: number; y: number }[] = [{ x: -len / 2, y: 0 }];
  let heading = 0;
  for (let i = 0; i < segments; i++) {
    heading += (rand() - 0.5) * 2.4; // sharp elbows, not smooth curves
    const segLen = (len / segments) * (0.7 + rand() * 0.6);
    const prev = points[points.length - 1];
    points.push({
      x: prev.x + Math.cos(heading) * segLen,
      y: prev.y + Math.sin(heading) * segLen,
    });
  }

  // The wash: strongest right at the contour, fading with each offset
  // pass to one side -- never a flat, evenly-filled shape.
  const side = rand() < 0.5 ? 1 : -1;
  for (let pass = 0; pass < 3; pass++) {
    const off = side * (pass * 1.6 + 1);
    const alpha = (0.4 - pass * 0.12) * (0.6 + note.amplitude * 0.5);
    if (alpha <= 0) continue;
    ctx.strokeStyle = color.rgba(alpha);
    ctx.lineWidth = inkWidth * (2.2 - pass * 0.5);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y + off);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y + off);
    }
    ctx.stroke();
  }

  // The confident ink contour, drawn last so it stays crisp over the
  // softer wash beneath it.
  ctx.strokeStyle = `rgba(28, 20, 16, ${(0.75 + rand() * 0.2).toFixed(2)})`;
  ctx.lineWidth = inkWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.restore();
};

const kandinsky: StyleRenderer = ({ ctx, cursor, note, color, rand }) => {
  // Overlapping translucent circles in vivid, jewel-toned color -- the
  // "Several Circles" / "Circles in a Circle" technique. Most marks are a
  // single soft disk of varying size; sometimes a few concentric rings
  // nest inside each other in a shifted hue, echoing how his rings often
  // carried unrelated but harmonious colors rather than one flat fill.
  const baseRadius = 4 + note.amplitude * 46;
  const isBig = rand() < 0.25;
  const radius = isBig ? baseRadius * (1.3 + rand() * 0.9) : baseRadius * (0.4 + rand() * 0.8);

  ctx.save();
  const rings = rand() < 0.35 ? 2 + Math.floor(rand() * 2) : 1;
  for (let i = 0; i < rings; i++) {
    const r = radius * (1 - (i / rings) * 0.62);
    const hueShift = i === 0 ? 0 : (rand() - 0.5) * 70;
    const hue = (color.hue + hueShift + 360) % 360;
    const alpha = 0.48 + rand() * 0.3;
    ctx.beginPath();
    ctx.arc(cursor.x, cursor.y, Math.max(1, r), 0, TAU);
    ctx.fillStyle = `hsla(${hue.toFixed(1)}, ${color.saturation.toFixed(0)}%, ${color.lightness.toFixed(0)}%, ${alpha.toFixed(3)})`;
    ctx.fill();
  }

  // A crisp ring of white or near-black around some circles -- a graphic
  // accent against the flat, soft-edged fills, as in the reference work.
  if (rand() < 0.4) {
    ctx.strokeStyle = rand() < 0.5 ? "rgba(250, 248, 240, 0.55)" : "rgba(10, 10, 12, 0.5)";
    ctx.lineWidth = 0.8 + rand() * 1.4;
    ctx.beginPath();
    ctx.arc(cursor.x, cursor.y, radius, 0, TAU);
    ctx.stroke();
  }
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
  schiele,
  louis,
  kandinsky,
  martin,
  marden,
};

export function renderStroke(styleId: PaintStyleId, s: StrokeContext) {
  STYLE_RENDERERS[styleId](s);
}
