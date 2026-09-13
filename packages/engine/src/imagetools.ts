/* ═══ Image tools ═══
 *
 * Crop geometry and the crop itself, shared by React and Vue. A crop is stored in fractions of the
 * image (0–1), so it survives the preview being scaled to fit the dialog; `cropImage` turns it
 * into real pixels with a canvas. The result is a new, smaller image — not a CSS trick — which the
 * host uploads like any other file. */

export interface CropRect {
  /** Left edge, as a fraction of the image width (0–1). */
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CropHandle = "nw" | "ne" | "sw" | "se";

export const FULL_CROP: CropRect = { x: 0, y: 0, width: 1, height: 1 };

/** Smallest crop, as a fraction of each side — keeps the box grabbable. */
const MIN = 0.05;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** The largest centred crop with this aspect ratio (width ÷ height, in pixels). */
export function aspectCrop(aspect: number, imageRatio: number): CropRect {
  let width = 1;
  let height = imageRatio / aspect;
  if (height > 1) {
    height = 1;
    width = aspect / imageRatio;
  }
  return { x: (1 - width) / 2, y: (1 - height) / 2, width, height };
}

/** Drag the whole box, kept inside the image. */
export function moveCrop(rect: CropRect, dx: number, dy: number): CropRect {
  return { ...rect, x: clamp(rect.x + dx, 0, 1 - rect.width), y: clamp(rect.y + dy, 0, 1 - rect.height) };
}

/** Drag a corner; the opposite corner stays put. With an aspect ratio the box keeps its shape and
 *  shrinks to fit rather than leaving the image. */
export function resizeCrop(rect: CropRect, handle: CropHandle, dx: number, dy: number, aspect: number | null, imageRatio: number): CropRect {
  const movesLeft = handle.endsWith("w");
  const movesTop = handle.startsWith("n");
  const anchorX = movesLeft ? rect.x + rect.width : rect.x;
  const anchorY = movesTop ? rect.y + rect.height : rect.y;
  const maxWidth = movesLeft ? anchorX : 1 - anchorX;
  const maxHeight = movesTop ? anchorY : 1 - anchorY;

  let width = clamp((movesLeft ? -dx : dx) + rect.width, MIN, maxWidth);
  let height = clamp((movesTop ? -dy : dy) + rect.height, MIN, maxHeight);

  if (aspect) {
    height = (width * imageRatio) / aspect;
    if (height > maxHeight) {
      height = maxHeight;
      width = (height * aspect) / imageRatio;
    }
  }

  return { x: movesLeft ? anchorX - width : anchorX, y: movesTop ? anchorY - height : anchorY, width, height };
}

export class CropError extends Error {
  /** "cors": the image's server doesn't allow reading its pixels. "load": it didn't load at all. */
  constructor(readonly code: "cors" | "load" | "encode") {
    super(`Image crop failed: ${code}`);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    /* Required to read the pixels of an image from another origin. Data and blob URLs are local. */
    if (!/^(data|blob):/i.test(src)) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new CropError(image.crossOrigin ? "cors" : "load"));
    image.src = src;
  });
}

/** Crop `src` to `rect` and return the new image. PNG stays PNG (transparency); everything else
 *  becomes JPEG. Scaled down to `maxWidth` (default 1200px — sharp at twice a 600px email). */
export async function cropImage(src: string, rect: CropRect, options: { maxWidth?: number; quality?: number } = {}): Promise<Blob> {
  const image = await loadImage(src);
  const sx = Math.round(rect.x * image.naturalWidth);
  const sy = Math.round(rect.y * image.naturalHeight);
  const sw = Math.max(1, Math.round(rect.width * image.naturalWidth));
  const sh = Math.max(1, Math.round(rect.height * image.naturalHeight));
  const scale = Math.min(1, (options.maxWidth ?? 1200) / sw);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new CropError("encode");
  context.imageSmoothingQuality = "high";
  context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  const type = /\.png(\?|#|$)|^data:image\/png/i.test(src) ? "image/png" : "image/jpeg";
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new CropError("encode"))), type, options.quality ?? 0.9);
    } catch {
      /* A canvas that drew a cross-origin image without CORS headers refuses to export. */
      reject(new CropError("cors"));
    }
  });
}

/** For hosts without an upload adapter: embed the cropped image directly. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
