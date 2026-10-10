import { describe, expect, it } from 'vitest';
import { Box3, Vector2 } from 'three';
import { createLetterStrokeGeometry, smoothPath, strokeOutline, toTrimeshArgs } from './strokeShape';

describe('smoothPath', () => {
  it('passes through the first and last control points', () => {
    const path = smoothPath([[0, 0], [1, 1], [2, 0]], 20);
    expect(path).toHaveLength(21);
    expect(path[0].x).toBeCloseTo(0);
    expect(path[20].x).toBeCloseTo(2);
    expect(path[20].y).toBeCloseTo(0);
  });

  it('rejects degenerate input', () => {
    expect(() => smoothPath([[0, 0]])).toThrow();
  });
});

describe('strokeOutline', () => {
  it('outlines a straight stroke as a capsule of the right size', () => {
    const shape = strokeOutline([new Vector2(0, 0), new Vector2(4, 0)], 1);
    const pts = shape.getPoints();
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    // Round caps extend half the width past each end.
    expect(Math.min(...xs)).toBeCloseTo(-0.5, 1);
    expect(Math.max(...xs)).toBeCloseTo(4.5, 1);
    expect(Math.min(...ys)).toBeCloseTo(-0.5, 5);
    expect(Math.max(...ys)).toBeCloseTo(0.5, 5);
  });
});

describe('createLetterStrokeGeometry', () => {
  it('produces a geometry of the requested depth, centred on Z', () => {
    const geometry = createLetterStrokeGeometry([[0, 0], [0, 3]], { width: 0.5, depth: 0.6 });
    const box = new Box3().setFromBufferAttribute(geometry.getAttribute('position') as never);
    expect(box.min.z).toBeCloseTo(-0.3, 2);
    expect(box.max.z).toBeCloseTo(0.3, 2);
    expect(box.max.y).toBeGreaterThan(3);
    expect(box.min.y).toBeLessThan(0);
  });

  it('converts to valid trimesh arrays', () => {
    const geometry = createLetterStrokeGeometry([[0, 0], [1, 0.5], [2, 0]], { width: 0.4, depth: 0.5 });
    const [vertices, indices] = toTrimeshArgs(geometry);
    expect(vertices.length % 3).toBe(0);
    expect(indices.length % 3).toBe(0);
    expect(Math.max(...indices)).toBeLessThan(vertices.length / 3);
  });
});
