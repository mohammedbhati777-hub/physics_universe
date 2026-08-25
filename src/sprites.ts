/* Object sprites — generated game-style assets used across canvas sims and 3D scenes.
   Every consumer falls back to its drawn shape if an asset fails to load. */

export const SPRITES: Record<string, string> = {
  ball: "https://image.qwenlm.ai/generated-images/89077125-fa10-4c22-9c7c-8897b172ba84/_result.png",
  feather: "https://image.qwenlm.ai/generated-images/a1338d33-e292-40b5-806b-bef7c698b26d/_result.png",
  steel: "https://image.qwenlm.ai/generated-images/7d726302-9345-4ade-b7ce-4fb12fece465/_result.png",
  ice: "https://image.qwenlm.ai/generated-images/8e14ec5b-dd4e-4dd5-b5bd-4a209d9cc796/_result.png",
  flame: "https://image.qwenlm.ai/generated-images/711f7df2-4cb6-41f8-9cb4-e2686b01ae72/_result.png",
  paper: "https://image.qwenlm.ai/generated-images/3d6271a4-8bb1-473f-a43e-3a74dd08781a/_result.png",
};

const cache: Record<string, HTMLImageElement> = {};

export function loadSprite(name: string): HTMLImageElement | null {
  const url = SPRITES[name];
  if (!url) return null;
  let img = cache[name];
  if (!img) {
    img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    cache[name] = img;
  }
  return img;
}

export function spriteReady(name: string): boolean {
  const img = cache[name];
  return !!img && img.complete && img.naturalWidth > 0;
}

/** Draw a named sprite centered at (x, y). Returns false when the asset is not
    available yet — callers keep their vector fallback visible either way. */
export function drawObj(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  size: number,
  rot = 0,
  alpha = 1
): boolean {
  const img = loadSprite(name);
  if (!img || !img.complete || !img.naturalWidth) return false;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
  return true;
}

/** Pre-warm the cache so first paint already shows assets. */
export function preloadSprites(names: string[]) {
  names.forEach(loadSprite);
}
