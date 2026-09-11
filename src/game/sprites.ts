/**
 * Offscreen sprite cache.
 *
 * The engine used to rebuild canvas gradients for every bullet, enemy and
 * flash particle on every frame — with 300+ projectiles on screen that is
 * thousands of gradient allocations per second and the main source of the
 * frame-time spikes. Each unique piece of art is now rasterised once into an
 * offscreen canvas and afterwards drawn with a single drawImage call.
 *
 * Sprites are painted at 2x resolution and drawn scaled down, so on a
 * devicePixelRatio-2 screen the result is pixel-identical to the vector path.
 */

const cache = new Map<string, HTMLCanvasElement | null>();

/** Hard cap so a pathological key explosion can never grow memory unbounded. */
const MAX_ENTRIES = 480;

export function clearSprites(): void {
  cache.clear();
}

/**
 * Returns a cached offscreen canvas, painting it on first use.
 * Returns null where offscreen canvases are unavailable (tests/SSR) so
 * callers can fall back to their original immediate-mode drawing.
 */
export function sprite(
  key: string,
  width: number,
  height: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
): HTMLCanvasElement | null {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  if (typeof document === "undefined") return null;
  if (cache.size >= MAX_ENTRIES) cache.clear();
  let canvas: HTMLCanvasElement | null = null;
  try {
    const c = document.createElement("canvas");
    c.width = Math.max(2, Math.ceil(width));
    c.height = Math.max(2, Math.ceil(height));
    const ctx = c.getContext("2d");
    if (ctx) {
      paint(ctx);
      canvas = c;
    }
  } catch {
    canvas = null;
  }
  cache.set(key, canvas);
  return canvas;
}

/** Soft radial glow dot used by flash particles; replaces per-frame radial gradients. */
export function glowSprite(color: string): HTMLCanvasElement | null {
  return sprite(`glow|${color}`, 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, color);
    g.addColorStop(0.42, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
}
