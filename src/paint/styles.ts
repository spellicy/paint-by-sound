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
  const reachJitter = rand() < 0.15 ? 0.3 + rand() * 0.4 : 0.8 + rand() * 2.4;
  const reach = (20 + note.amplitude * 130) * reachJitter;
  const segments = 3 + Math.floor(rand() * 4);
  const baseWidth = 1.8 + note.amplitude * 7;
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

  // Lay down the raw waypoints of a whip-like walk first, then render them
  // as one continuous curve (below), rather than each segment being its
  // own independently-bowed arc. Heading changes are large and frequent
  // enough that the walk zigzags and can double back on itself, rather
  // than drifting gently in one direction -- a gentle drift over only a
  // handful of waypoints reads as a single smooth arch, not the erratic
  // whip-crack of real flung paint. Continuity between segments (below)
  // keeps this fluid rather than a chain of jagged corners even with
  // sharp turns here.
  const pts: { x: number; y: number }[] = [{ x: cursor.x, y: cursor.y }];
  let heading = rand() * TAU;
  for (let i = 0; i < segments; i++) {
    heading += (rand() - 0.5) * (rand() < 0.3 ? 3.4 : 1.5);
    const segLen = (reach / segments) * (0.5 + rand() * 1.0);
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
  if (rand() < 0.3) {
    const bx = cursor.x + (px - cursor.x) * rand();
    const by = cursor.y + (py - cursor.y) * rand();
    const br = 3 + rand() * (6 + note.amplitude * 16);
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
  const spreadRadius = isBigSpray ? 22 + note.amplitude * 55 : 16;
  ctx.fillStyle = color.rgba(0.5);
  for (let i = 0; i < flickCount; i++) {
    const t = rand();
    const fx = cursor.x + (px - cursor.x) * t + (rand() - 0.5) * spreadRadius;
    const fy = cursor.y + (py - cursor.y) * t + (rand() - 0.5) * spreadRadius;
    // rand()*rand() skews toward small drops with an occasional larger
    // splat, the way real spatter distributes -- mostly fine, rarely fat.
    const r = 0.6 + rand() * rand() * (isBigSpray ? 7 : 2.4) * (0.5 + note.amplitude);
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
  const len = 32 + note.amplitude * 100;
  const segments = 3 + Math.floor(rand() * 3);
  const inkWidth = 1.8 + note.amplitude * 3.4;

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

const delaunay: StyleRenderer = ({ ctx, cursor, note, color, rand }) => {
  // "Simultaneous Disks" / "Manege de cochons": concentric color rings,
  // stepping through the spectrum ring to ring rather than blending --
  // Orphism's confident color contrast. But the actual paintings read as
  // hand-brushed, not vector art: every ring's edge carries a slight
  // freehand wobble rather than a mechanically perfect circle, the
  // outermost ring feathers softly into the canvas instead of stopping in
  // a laser-crisp boundary, and the accent rings are a warm near-black or
  // aged cream rather than pure digital black/white -- all of it toward a
  // painterly, slightly worn 1920s canvas rather than a flat modern
  // vector illustration. Occasionally only a half or a quarter of the
  // disc is drawn, echoing how his discs read as cropped by neighboring
  // shapes or the canvas edge. Drawn largest ring first, each smaller
  // ring painted on top, so only an annular band of each larger ring
  // stays visible.
  //
  // Size varies independently of amplitude, not just scaled by it -- his
  // discs range from small satellite circles to canvas-filling targets
  // within the same piece, not one fairly uniform size throughout.
  const baseRadius = 10 + note.amplitude * 60;
  const sizeRoll = rand();
  const radius =
    sizeRoll < 0.18
      ? baseRadius * (0.22 + rand() * 0.28) // small
      : sizeRoll < 0.8
        ? baseRadius * (0.6 + rand() * 0.5) // medium -- the common case
        : baseRadius * (1.3 + rand() * 1.5); // large
  const rings = 3 + Math.floor(rand() * 3) + (radius > baseRadius ? 1 : 0);
  const ringStep = radius / rings;
  const hueStep = 26 + rand() * 10;

  const shapeRoll = rand();
  let startAngle = 0;
  let endAngle = TAU;
  if (shapeRoll < 0.35) {
    const rot = rand() * TAU;
    startAngle = rot;
    endAngle = rot + Math.PI;
  } else if (shapeRoll < 0.6) {
    const rot = rand() * TAU;
    startAngle = rot;
    endAngle = rot + Math.PI / 2;
  }

  // A gentle, irregular wobble traced through every ring's boundary --
  // three or four soft bumps around the circumference, not a perfect
  // radius -- so the whole shape reads as brushed freehand rather than
  // drawn with a compass.
  const wobblePhase = rand() * TAU;
  const wobbleLobes = 3 + Math.floor(rand() * 2);
  const wobbleAmt = 0.035 + rand() * 0.05;
  const wobblePath = (r: number, a0: number, a1: number) => {
    ctx.moveTo(cursor.x, cursor.y);
    const steps = Math.max(8, Math.ceil((32 * (a1 - a0)) / TAU));
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (a1 - a0) * (i / steps);
      const wob = 1 + Math.sin(a * wobbleLobes + wobblePhase) * wobbleAmt;
      ctx.lineTo(cursor.x + Math.cos(a) * r * wob, cursor.y + Math.sin(a) * r * wob);
    }
  };

  ctx.save();
  let outerFill = "";
  for (let i = rings; i >= 1; i--) {
    const r = ringStep * i;
    let fill: string;
    const achromaticRoll = rand();
    if (achromaticRoll < 0.08) {
      fill = "hsl(18, 38%, 12%)"; // warm ink, not pure digital black
    } else if (achromaticRoll < 0.16) {
      fill = "hsl(42, 32%, 88%)"; // aged cream, not pure digital white
    } else {
      const hue = (color.hue + i * hueStep + (rand() - 0.5) * 8 + 360) % 360;
      const sat = clamp(color.saturation, 42, 78);
      const light = clamp(color.lightness + (i % 2 === 0 ? 5 : -5), 26, 56);
      fill = `hsl(${hue.toFixed(1)}, ${sat.toFixed(0)}%, ${light.toFixed(0)}%)`;
    }
    if (i === rings) outerFill = fill;
    ctx.beginPath();
    wobblePath(Math.max(1, r), startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  // The outermost color feathers softly outward instead of stopping in a
  // crisp vector boundary -- a thin, translucent bloom bleeding into the
  // bare canvas the way brushed paint actually settles.
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  wobblePath(Math.max(1, radius * 1.08), startAngle, endAngle);
  ctx.closePath();
  ctx.fillStyle = outerFill;
  ctx.fill();
  ctx.restore();
};

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

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

const miro: StyleRenderer = ({ ctx, cursor, note, color, rand }) => {
  // Miro's world is a small, recurring repertoire of signs -- a biomorphic
  // amoeba blob, a looping calligraphic squiggle, a flat solid dot, a
  // radiating star, a watchful eye -- scattered across mostly bare ground
  // rather than any one continuous gesture. Each mark draws one sign from
  // that repertoire, chosen at random, instead of always the same shape.
  const scale = 0.55 + note.amplitude * 1.5;
  const roll = rand();

  ctx.save();
  ctx.translate(cursor.x, cursor.y);
  ctx.rotate(rand() * TAU);

  if (roll < 0.3) {
    miroBlob(ctx, scale, color.rgb, rand);
  } else if (roll < 0.55) {
    miroSquiggle(ctx, scale, rand);
  } else if (roll < 0.75) {
    miroDot(ctx, scale, color.rgb, rand);
  } else if (roll < 0.88) {
    miroStar(ctx, scale, rand);
  } else {
    miroEye(ctx, scale, rand);
  }
  ctx.restore();
};

function miroBlob(ctx: CanvasRenderingContext2D, s: number, fill: string, rand: () => number) {
  // An irregular, lobed amoeba outline -- never a clean circle or ellipse
  // -- built the same way as Pollock's pooled blob (jittered points on a
  // ring, joined with quadratic curves) but smoother and larger, since
  // this is a deliberate biomorphic sign rather than a paint pool.
  const r = (9 + rand() * 20) * s;
  const lobes = 6 + Math.floor(rand() * 4);
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * TAU;
    const rr = r * (0.55 + rand() * 0.75);
    pts.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr * (0.65 + rand() * 0.35) });
  }
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[i];
    const p1 = pts[(i + 1) % pts.length];
    const mx = (p0.x + p1.x) / 2;
    const my = (p0.y + p1.y) / 2;
    if (i === 0) ctx.moveTo(mx, my);
    else ctx.quadraticCurveTo(p0.x, p0.y, mx, my);
  }
  ctx.closePath();

  // Usually a flat, confident fill -- his signature poster-paint solidity
  // -- sometimes just the ink outline, left open like a drawn glyph.
  if (rand() < 0.75) {
    ctx.fillStyle = fill;
    ctx.fill();
    if (rand() < 0.5) {
      ctx.strokeStyle = "rgba(20, 18, 16, 0.85)";
      ctx.lineWidth = 1.4 * s;
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = "rgba(20, 18, 16, 0.85)";
    ctx.lineWidth = 1.8 * s;
    ctx.stroke();
  }

  // A small dot nested inside, echoing how his flat shapes often carry a
  // tiny secondary mark -- a seed, a pupil, a satellite.
  if (rand() < 0.3) {
    ctx.beginPath();
    ctx.arc((rand() - 0.5) * r * 0.5, (rand() - 0.5) * r * 0.5, (1.4 + rand() * 2) * s, 0, TAU);
    ctx.fillStyle = "rgba(20, 18, 16, 0.9)";
    ctx.fill();
  }
}

function miroSquiggle(ctx: CanvasRenderingContext2D, s: number, rand: () => number) {
  // A thin, meandering calligraphic line -- the hand-drawn connective
  // tissue between the bigger signs -- built from sharp, frequent
  // direction changes (like Schiele's contour) rather than one smooth
  // curve, occasionally closing into a small loop at its tail.
  const len = (26 + rand() * 50) * s;
  const segments = 5 + Math.floor(rand() * 5);
  ctx.strokeStyle = "rgba(20, 18, 16, 0.85)";
  ctx.lineWidth = Math.max(0.8, (1 + rand() * 1.1) * s * 0.7);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  let x = -len / 2;
  let y = 0;
  ctx.moveTo(x, y);
  let heading = 0;
  let tail = { x, y };
  for (let i = 0; i < segments; i++) {
    heading += (rand() - 0.5) * 3.4;
    const segLen = (len / segments) * (0.5 + rand());
    const nx = x + Math.cos(heading) * segLen;
    const ny = y + Math.sin(heading) * segLen;
    const cx = x + Math.cos(heading - 0.7) * segLen * 0.5;
    const cy = y + Math.sin(heading - 0.7) * segLen * 0.5;
    ctx.quadraticCurveTo(cx, cy, nx, ny);
    x = nx;
    y = ny;
    tail = { x, y };
  }
  ctx.stroke();

  if (rand() < 0.4) {
    const lr = (3 + rand() * 5) * s;
    ctx.beginPath();
    ctx.arc(tail.x, tail.y, lr, 0, TAU);
    ctx.stroke();
  }
}

function miroDot(ctx: CanvasRenderingContext2D, s: number, fill: string, rand: () => number) {
  // A small flat disc -- the recurring "planet"/seed mark -- occasionally
  // ringed with a thin outline set slightly outside it.
  const r = (2.2 + rand() * 6) * s;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
  if (rand() < 0.4) {
    ctx.strokeStyle = "rgba(20, 18, 16, 0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r + 2 * s, 0, TAU);
    ctx.stroke();
  }
}

function miroStar(ctx: CanvasRenderingContext2D, s: number, rand: () => number) {
  // A small radiating burst of short strokes from a point -- the
  // asterisk-like star that recurs throughout his skies.
  const rays = 5 + Math.floor(rand() * 3);
  const r = (5 + rand() * 8) * s;
  ctx.strokeStyle = "rgba(20, 18, 16, 0.85)";
  ctx.lineWidth = 1.3 * s;
  ctx.lineCap = "round";
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * TAU + rand() * 0.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.stroke();
  }
}

function miroEye(ctx: CanvasRenderingContext2D, s: number, rand: () => number) {
  // The recurring watchful eye -- an almond outline with a solid pupil
  // and, sometimes, a couple of short lashes -- about as figurative as
  // this otherwise abstract sign language gets.
  const rx = (6 + rand() * 6) * s;
  const ry = rx * (0.5 + rand() * 0.3);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
  ctx.strokeStyle = "rgba(20, 18, 16, 0.85)";
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, Math.min(rx, ry) * 0.42, 0, TAU);
  ctx.fillStyle = "rgba(20, 18, 16, 0.9)";
  ctx.fill();

  if (rand() < 0.4) {
    for (let i = -1; i <= 1; i++) {
      const lx = i * rx * 0.5;
      ctx.beginPath();
      ctx.moveTo(lx, -ry);
      ctx.lineTo(lx + i * 2, -ry - 4 - rand() * 2);
      ctx.strokeStyle = "rgba(20, 18, 16, 0.7)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

const STYLE_RENDERERS: Record<PaintStyleId, StyleRenderer> = {
  rothko,
  pollock,
  dekooning,
  schiele,
  louis,
  kandinsky,
  delaunay,
  martin,
  marden,
  miro,
};

export function renderStroke(styleId: PaintStyleId, s: StrokeContext) {
  STYLE_RENDERERS[styleId](s);
}
