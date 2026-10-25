// Shape helpers for the pieces, in a 32-unit design space (rasterised at 64 pixels by pieces.ts).
export type Shape = (x: number, y: number) => boolean;
export const rect = (x0: number, y0: number, x1: number, y1: number): Shape => (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
/** A band between y0 and y1, symmetric around the middle, half-width going from w0 to w1. */
export const half = (y0: number, y1: number, w0: number, w1: number): Shape => (x, y) => y >= y0 && y < y1 && Math.abs(x - 16) < w0 + ((w1 - w0) * (y - y0)) / (y1 - y0);
export const ellipse = (cx: number, cy: number, rx: number, ry: number): Shape => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
export const polygon = (pts: [number, number][]): Shape => (x, y) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
/** A thick line segment (for slits, notches, antlers). */
export const segment = (x0: number, y0: number, x1: number, y1: number, w: number): Shape => (x, y) => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy)) <= w / 2;
};
export const any = (...s: Shape[]): Shape => (x, y) => s.some((f) => f(x, y));
export const minus = (a: Shape, ...b: Shape[]): Shape => (x, y) => a(x, y) && !b.some((f) => f(x, y));
/** Mirror a shape around the middle (x = 16). */
export const mirror = (s: Shape): Shape => (x, y) => s(32 - x, y);

/** The plinth every piece stands on. */
export const base = any(half(23.5, 25.5, 7.5, 8.5), rect(5.5, 25.5, 26.5, 29));

export interface Design {
  body: Shape;
  /** Parts drawn in the set's trim colour (gold by default). */
  gold?: Shape;
  /** Dark carved lines inside the body (eyes, slits). */
  carve?: Shape;
}
