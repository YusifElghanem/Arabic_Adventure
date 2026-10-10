import { BufferAttribute, CatmullRomCurve3, ExtrudeGeometry, Shape, Vector2, Vector3, type BufferGeometry } from 'three';

/**
 * Builds chunky 3D letter strokes. A smooth centre line (as a pen would draw
 * the letter) is offset to both sides, closed with round caps, then
 * extruded with a bevel. The result looks like a soft, toy-like letter.
 */

/** Samples a smooth Catmull-Rom curve through 2D control points. */
export function smoothPath(points: readonly [number, number][], samples = 48): Vector2[] {
  if (points.length < 2) throw new Error('smoothPath needs at least two points');
  const curve = new CatmullRomCurve3(points.map(([x, y]) => new Vector3(x, y, 0)), false, 'centripetal');
  return curve.getSpacedPoints(samples).map((p) => new Vector2(p.x, p.y));
}

/** Outlines a centre line as a closed shape of the given full width with round end caps. */
export function strokeOutline(path: readonly Vector2[], width: number, capSegments = 10): Shape {
  if (path.length < 2) throw new Error('strokeOutline needs at least two points');
  const half = width / 2;
  const left: Vector2[] = [];
  const right: Vector2[] = [];

  for (let i = 0; i < path.length; i++) {
    const prev = path[Math.max(0, i - 1)];
    const next = path[Math.min(path.length - 1, i + 1)];
    const tangent = new Vector2().subVectors(next, prev).normalize();
    const normal = new Vector2(-tangent.y, tangent.x);
    left.push(path[i].clone().addScaledVector(normal, half));
    right.push(path[i].clone().addScaledVector(normal, -half));
  }

  const cap = (center: Vector2, from: Vector2, sweepSign: number): Vector2[] => {
    const start = Math.atan2(from.y - center.y, from.x - center.x);
    const out: Vector2[] = [];
    for (let s = 1; s < capSegments; s++) {
      const angle = start + sweepSign * (Math.PI * s) / capSegments;
      out.push(new Vector2(center.x + Math.cos(angle) * half, center.y + Math.sin(angle) * half));
    }
    return out;
  };

  const last = path.length - 1;
  // Walk the left side forward, round the end, walk the right side back, round the start.
  const outline = [
    ...left,
    ...cap(path[last], left[last], -1),
    ...right.slice().reverse(),
    ...cap(path[0], right[0], -1),
  ];
  return new Shape(outline);
}

export interface LetterStrokeOptions {
  width: number;
  depth: number;
  bevel?: number;
  samples?: number;
}

/** Extrudes a stroke into a bevelled, centred (on Z) letter geometry. */
export function createLetterStrokeGeometry(
  points: readonly [number, number][],
  { width, depth, bevel = Math.min(width, depth) * 0.22, samples = 48 }: LetterStrokeOptions,
): ExtrudeGeometry {
  const shape = strokeOutline(smoothPath(points, samples), width);
  const geometry = new ExtrudeGeometry(shape, {
    depth: Math.max(0.001, depth - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 4,
    curveSegments: 8,
  });
  geometry.translate(0, 0, -(depth - bevel * 2) / 2);
  geometry.computeVertexNormals();
  return geometry;
}

/** Vertex and index arrays for a Rapier trimesh collider from any geometry. */
export function toTrimeshArgs(geometry: BufferGeometry): [Float32Array, Uint32Array] {
  const position = geometry.getAttribute('position') as BufferAttribute;
  const vertices = new Float32Array(position.array as ArrayLike<number>);
  const index = geometry.getIndex();
  const indices = index
    ? new Uint32Array(index.array as ArrayLike<number>)
    : Uint32Array.from({ length: position.count }, (_, i) => i);
  return [vertices, indices];
}
