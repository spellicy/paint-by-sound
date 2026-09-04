// A small library of literal subjects -- a person, a cat, a tree -- each
// built from a handful of simple parametric parts (ellipses, circles,
// polygons) in a normalized design space, the same procedural spirit as
// the abstract landscape primitives in motifs.ts, just composed into
// recognizable figures instead of a horizon or a spiral. The shapes here
// carry no color or brush technique of their own -- `sampleSilhouette`
// just returns points along their outlines and scattered through their
// interiors, which motifs.ts hands to whichever painter is selected. A
// "cat" sampled through Picasso's fragmented-plane renderer comes out
// jagged and cubist; the same points through Monet's broken-color dabs
// come out soft and impressionist -- the literal subject stays constant,
// the technique is entirely the painter's own.

export interface Point {
  x: number;
  y: number;
}
export type SubPath = Point[];

export interface Silhouette {
  subPaths: SubPath[];
}

const TAU = Math.PI * 2;

function ellipsePoly(cx: number, cy: number, rx: number, ry: number, rot = 0, n = 14): SubPath {
  const pts: SubPath = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const ex = Math.cos(a) * rx;
    const ey = Math.sin(a) * ry;
    pts.push({
      x: cx + ex * Math.cos(rot) - ey * Math.sin(rot),
      y: cy + ex * Math.sin(rot) + ey * Math.cos(rot),
    });
  }
  return pts;
}

function circlePoly(cx: number, cy: number, r: number, n = 14): SubPath {
  return ellipsePoly(cx, cy, r, r, 0, n);
}

function starPoly(cx: number, cy: number, rOuter: number, rInner: number, points = 5): SubPath {
  const pts: SubPath = [];
  const step = Math.PI / points;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = i * step - Math.PI / 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

/** Design space is roughly -50..50 in both axes, origin at the figure's
 * visual center -- scaled and positioned onto the canvas at render time
 * (see `sampleSilhouette`). */
export type SubjectFigure =
  | "person"
  | "cat"
  | "dog"
  | "bird"
  | "tree"
  | "house"
  | "flower"
  | "boat"
  | "car"
  | "star"
  | "heart";

export const SILHOUETTES: Record<SubjectFigure, Silhouette> = {
  person: {
    subPaths: [
      circlePoly(0, -38, 9), // head
      ellipsePoly(0, -10, 12, 20, 0), // torso
      ellipsePoly(-16, -14, 3.2, 16, -0.35), // left arm
      ellipsePoly(16, -14, 3.2, 16, 0.35), // right arm
      ellipsePoly(-7, 26, 4, 20, -0.08), // left leg
      ellipsePoly(7, 26, 4, 20, 0.08), // right leg
    ],
  },
  cat: {
    subPaths: [
      ellipsePoly(0, 8, 22, 12, 0), // body
      circlePoly(-24, -3, 9), // head
      [
        { x: -30, y: -9 },
        { x: -26, y: -19 },
        { x: -22, y: -10 },
      ], // left ear
      [
        { x: -23, y: -10 },
        { x: -19, y: -20 },
        { x: -15, y: -10 },
      ], // right ear
      // Tail: a thin curving ribbon (not just a straight rotated ellipse)
      // arcing up from the back of the body, the way a cat's tail actually
      // reads in silhouette rather than sticking out like a beak.
      [
        { x: 24, y: 6 },
        { x: 34, y: 0 },
        { x: 40, y: -10 },
        { x: 43, y: -20 },
        { x: 43, y: -16 },
        { x: 37, y: -7 },
        { x: 30, y: 3 },
        { x: 22, y: 10 },
      ],
      ellipsePoly(-13, 20, 3, 7, 0),
      ellipsePoly(-4, 21, 3, 7, 0),
      ellipsePoly(6, 21, 3, 7, 0),
      ellipsePoly(14, 19, 3, 7, 0),
    ],
  },
  dog: {
    subPaths: [
      ellipsePoly(0, 8, 24, 13, 0), // body
      circlePoly(-26, -3, 10), // head
      ellipsePoly(-38, 0, 7, 4, 0.15), // snout
      ellipsePoly(-16, 1, 5, 10, -0.15), // left ear (droopy, hangs down)
      ellipsePoly(-35, 1, 5, 10, 0.15), // right ear
      // Tail: a curving ribbon rather than a straight rotated ellipse, so
      // it reads as a tail rather than a stick.
      [
        { x: 22, y: 8 },
        { x: 33, y: 2 },
        { x: 39, y: -9 },
        { x: 38, y: -19 },
        { x: 34, y: -16 },
        { x: 34, y: -8 },
        { x: 28, y: 1 },
        { x: 20, y: 12 },
      ],
      ellipsePoly(-14, 19, 4, 7, 0),
      ellipsePoly(-3, 20, 4, 7, 0),
      ellipsePoly(9, 20, 4, 7, 0),
      ellipsePoly(19, 18, 4, 7, 0),
    ],
  },
  bird: {
    subPaths: [
      ellipsePoly(2, 0, 15, 10, -0.1), // body
      circlePoly(-17, -7, 6.5), // head
      [
        { x: -24, y: -8 },
        { x: -30, y: -6 },
        { x: -24, y: -4 },
      ], // beak
      ellipsePoly(8, -6, 14, 5, -0.5), // wing
      [
        { x: 16, y: 6 },
        { x: 26, y: 2 },
        { x: 24, y: 10 },
        { x: 15, y: 12 },
      ], // tail
    ],
  },
  tree: {
    subPaths: [
      [
        { x: -4, y: 10 },
        { x: 4, y: 10 },
        { x: 5, y: 44 },
        { x: -5, y: 44 },
      ], // trunk
      circlePoly(0, -18, 22), // canopy
      circlePoly(-14, -4, 15),
      circlePoly(14, -4, 15),
    ],
  },
  house: {
    subPaths: [
      [
        { x: -20, y: -2 },
        { x: 20, y: -2 },
        { x: 20, y: 25 },
        { x: -20, y: 25 },
      ], // body
      [
        { x: -25, y: -2 },
        { x: 0, y: -28 },
        { x: 25, y: -2 },
      ], // roof
      [
        { x: -5, y: 8 },
        { x: 5, y: 8 },
        { x: 5, y: 25 },
        { x: -5, y: 25 },
      ], // door
      [
        { x: 11, y: -26 },
        { x: 18, y: -26 },
        { x: 18, y: -10 },
        { x: 11, y: -10 },
      ], // chimney
    ],
  },
  flower: {
    subPaths: [
      [
        { x: -1.5, y: 6 },
        { x: 1.5, y: 6 },
        { x: 1.5, y: 40 },
        { x: -1.5, y: 40 },
      ], // stem
      circlePoly(0, 0, 6), // center
      ...[0, 1, 2, 3, 4, 5].map((i) =>
        ellipsePoly(
          Math.cos((i / 6) * TAU) * 14,
          Math.sin((i / 6) * TAU) * 14,
          9,
          5,
          (i / 6) * TAU,
        ),
      ), // petals
    ],
  },
  boat: {
    subPaths: [
      [
        { x: -22, y: 8 },
        { x: 22, y: 8 },
        { x: 15, y: 22 },
        { x: -15, y: 22 },
      ], // hull
      [
        { x: -1, y: -30 },
        { x: 1, y: -30 },
        { x: 1, y: 8 },
        { x: -1, y: 8 },
      ], // mast
      [
        { x: 1, y: -27 },
        { x: 1, y: 6 },
        { x: 21, y: 6 },
      ], // sail
    ],
  },
  car: {
    subPaths: [
      [
        { x: -24, y: -2 },
        { x: -17, y: -14 },
        { x: 14, y: -14 },
        { x: 20, y: -2 },
        { x: 24, y: -2 },
        { x: 24, y: 8 },
        { x: -24, y: 8 },
      ], // body + cabin
      circlePoly(-14, 10, 6), // wheel
      circlePoly(14, 10, 6), // wheel
    ],
  },
  star: {
    subPaths: [starPoly(0, 0, 22, 9)],
  },
  heart: {
    subPaths: [
      circlePoly(-9, -6, 11),
      circlePoly(9, -6, 11),
      [
        { x: -19, y: -2 },
        { x: 19, y: -2 },
        { x: 0, y: 26 },
      ],
    ],
  },
};

export interface SilhouettePoint {
  x: number;
  y: number;
  heading?: number;
  partIndex: number;
}

/**
 * Sample a silhouette into canvas-space points: one per outline edge
 * (with a heading along that edge, for directional painters like Van
 * Gogh), plus `fillCount` interior points found by rejection sampling
 * against the design's combined bounding box. `partIndex` identifies
 * which sub-shape (body, ear, wing, ...) a point belongs to, so callers
 * can vary hue slightly part to part.
 */
export function sampleSilhouette(
  silhouette: Silhouette,
  cx: number,
  cy: number,
  scale: number,
  rand: () => number,
  fillCount: number,
): SilhouettePoint[] {
  const transformed: SubPath[] = silhouette.subPaths.map((sp) =>
    sp.map((p) => ({ x: cx + (p.x / 50) * scale, y: cy + (p.y / 50) * scale })),
  );

  const points: SilhouettePoint[] = [];

  transformed.forEach((sp, partIndex) => {
    for (let i = 0; i < sp.length; i++) {
      const a = sp[i];
      const b = sp[(i + 1) % sp.length];
      points.push({
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        heading: Math.atan2(b.y - a.y, b.x - a.x),
        partIndex,
      });
    }
  });

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const sp of transformed) {
    for (const p of sp) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  }

  let attempts = 0;
  let placed = 0;
  while (placed < fillCount && attempts < fillCount * 25) {
    attempts++;
    const x = minX + rand() * (maxX - minX);
    const y = minY + rand() * (maxY - minY);
    const partIndex = transformed.findIndex((sp) => pointInPolygon(x, y, sp));
    if (partIndex === -1) continue;
    points.push({ x, y, partIndex });
    placed++;
  }

  return points;
}

function pointInPolygon(px: number, py: number, poly: SubPath): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
