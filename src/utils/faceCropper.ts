/**
 * Face cropping for the player avatar.
 *
 * Pipeline: decode the photo (honouring EXIF orientation), find the face, then
 * render an anti-aliased, softly feathered oval cut-out to a square,
 * transparent base64 data URL. That URL is used as the head texture.
 *
 * Face detection, best first:
 *   1. The browser's built-in Shape Detection `FaceDetector`, where available.
 *   2. A skin-tone segmentation heuristic in YCbCr space. It works across a
 *      wide range of skin tones and needs no ML model download.
 *   3. A centred portrait crop, the typical framing of a child's photo.
 *
 * Detection only *suggests* a crop. The upload modal lets the parent pan and
 * zoom the oval before saving.
 */

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** An elliptical crop in source-image pixel coordinates. */
export interface FaceRegion {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export type DetectionMethod = 'native' | 'skin' | 'fallback';

export interface LoadedPhoto {
  /** Decoded, orientation-corrected and size-capped image. */
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export interface FaceCropResult {
  dataUrl: string;
  region: FaceRegion;
  method: DetectionMethod;
  photo: LoadedPhoto;
}

export interface RenderOptions {
  /** Output edge length in pixels (the output is square). */
  size?: number;
  /** Width of the soft edge, as a fraction of the output size. */
  feather?: number;
}

export class FaceCropError extends Error {
  constructor(
    message: string,
    readonly code: 'not-an-image' | 'too-large' | 'decode-failed' | 'encode-failed',
  ) {
    super(message);
    this.name = 'FaceCropError';
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Constants                                  */
/* -------------------------------------------------------------------------- */

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
/** Longest edge kept after decoding; larger photos are downscaled to save memory. */
const MAX_WORKING_EDGE = 1600;
/** Longest edge of the image analysed for skin pixels. */
const ANALYSIS_EDGE = 160;
/** Smallest skin blob, as a share of the analysed image, that can count as a face. */
const MIN_BLOB_SHARE = 0.015;
/** Default output size; 384px keeps the stored data URL small but crisp on the head. */
export const DEFAULT_OUTPUT_SIZE = 384;
/** Faces are taller than wide; keep the crop oval within these height/width ratios. */
const MIN_OVAL_RATIO = 1.1;
const MAX_OVAL_RATIO = 1.4;
/** Zoom limits for manual adjustment: the oval's ry as a share of the shorter image edge. */
export const MIN_REGION_SHARE = 0.08;
export const MAX_REGION_SHARE = 0.75;

/* -------------------------------------------------------------------------- */
/*                         Pure detection primitives                          */
/* -------------------------------------------------------------------------- */

/**
 * Classifies a pixel as skin using the YCbCr chroma ranges popularised by
 * Chai & Ngan. Chroma is largely independent of skin darkness, so a wide
 * range of skin tones is accepted. The luma floor rejects near-black shadows.
 */
export function isSkinPixel(r: number, g: number, b: number): boolean {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  if (y < 35) return false;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;
}

/** Builds a binary skin mask (1 = skin) from RGBA pixel data. */
export function buildSkinMask(data: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const mask = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
    // Ignore transparent pixels (e.g. PNG cut-outs).
    if (data[p + 3] < 128) continue;
    mask[i] = isSkinPixel(data[p], data[p + 1], data[p + 2]) ? 1 : 0;
  }
  return mask;
}

/**
 * Finds the 4-connected skin blob most likely to be a face: large, and near
 * the upper centre of the frame, where portraits put the face. Returns its
 * bounding box in mask coordinates, or null if nothing is big enough.
 */
export function findFaceBlob(mask: Uint8Array, width: number, height: number): Box | null {
  const labels = new Int32Array(mask.length);
  const stack = new Int32Array(mask.length);
  const minArea = Math.max(4, Math.floor(mask.length * MIN_BLOB_SHARE));
  let nextLabel = 0;
  let best: { box: Box; score: number } | null = null;

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start]) continue;

    nextLabel++;
    let top = 0;
    stack[top++] = start;
    labels[start] = nextLabel;
    let area = 0;
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let sumX = 0, sumY = 0;

    while (top > 0) {
      const index = stack[--top];
      const x = index % width;
      const y = (index - x) / width;
      area++;
      sumX += x;
      sumY += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      if (x > 0 && mask[index - 1] && !labels[index - 1]) { labels[index - 1] = nextLabel; stack[top++] = index - 1; }
      if (x < width - 1 && mask[index + 1] && !labels[index + 1]) { labels[index + 1] = nextLabel; stack[top++] = index + 1; }
      if (y > 0 && mask[index - width] && !labels[index - width]) { labels[index - width] = nextLabel; stack[top++] = index - width; }
      if (y < height - 1 && mask[index + width] && !labels[index + width]) { labels[index + width] = nextLabel; stack[top++] = index + width; }
    }

    if (area < minArea) continue;

    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;
    // Faces fill a good part of their bounding box. Thin streaks such as
    // wooden furniture edges do not.
    const fill = area / (boxWidth * boxHeight);
    if (fill < 0.3) continue;

    const dx = sumX / area / width - 0.5;
    const dy = sumY / area / height - 0.4;
    const centrality = 1 - Math.min(1, Math.hypot(dx, dy) / 0.75);
    const score = area * (0.35 + 0.65 * centrality) * (0.6 + 0.4 * fill);

    if (!best || score > best.score) {
      best = { box: { x: minX, y: minY, width: boxWidth, height: boxHeight }, score };
    }
  }

  if (!best) return null;

  // A skin blob often runs on into the neck and chest. A face is rarely more
  // than ~1.35x taller than wide, so trim from the bottom.
  const { box } = best;
  const maxHeight = Math.round(box.width * 1.35);
  if (box.height > maxHeight) box.height = maxHeight;
  return box;
}

/** Runs skin detection on RGBA data and returns the face box, or null. */
export function detectFaceBoxFromPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Box | null {
  return findFaceBlob(buildSkinMask(data, width, height), width, height);
}

/**
 * Turns a tight face box into the oval we cut out. It is padded so it takes
 * in the chin, cheeks and some hair, which reads better on a round head.
 */
export function regionFromFaceBox(box: Box): FaceRegion {
  const rx = (box.width / 2) * 1.2;
  let ry = (box.height / 2) * 1.3;
  ry = Math.min(Math.max(ry, rx * MIN_OVAL_RATIO), rx * MAX_OVAL_RATIO);
  return {
    cx: box.x + box.width / 2,
    // Shift up slightly: the forehead matters more than the neck.
    cy: box.y + box.height * 0.46,
    rx,
    ry,
  };
}

/** A centred head-and-shoulders guess, used when no face is detected. */
export function defaultFaceRegion(width: number, height: number): FaceRegion {
  const short = Math.min(width, height);
  const ry = short * 0.32;
  return { cx: width / 2, cy: height * 0.42, rx: ry / 1.25, ry };
}

/** Keeps a region a sane size and its centre inside the image. */
export function clampRegion(region: FaceRegion, width: number, height: number): FaceRegion {
  const short = Math.min(width, height);
  const ratio = region.rx > 0 ? Math.min(Math.max(region.ry / region.rx, MIN_OVAL_RATIO), MAX_OVAL_RATIO) : 1.25;
  const ry = Math.min(Math.max(region.ry, short * MIN_REGION_SHARE), short * MAX_REGION_SHARE);
  return {
    cx: Math.min(Math.max(region.cx, 0), width),
    cy: Math.min(Math.max(region.cy, 0), height),
    rx: ry / ratio,
    ry,
  };
}

/** Returns a new region scaled about its centre (for the zoom control). */
export function scaleRegion(region: FaceRegion, factor: number): FaceRegion {
  return { ...region, rx: region.rx * factor, ry: region.ry * factor };
}

/* -------------------------------------------------------------------------- */
/*                               Browser helpers                              */
/* -------------------------------------------------------------------------- */

interface NativeDetectedFace {
  boundingBox: DOMRectReadOnly;
}
interface NativeFaceDetector {
  detect(image: CanvasImageSource): Promise<NativeDetectedFace[]>;
}
type NativeFaceDetectorCtor = new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => NativeFaceDetector;

const createCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
};

const get2d = (canvas: HTMLCanvasElement, options?: CanvasRenderingContext2DSettings) => {
  const ctx = canvas.getContext('2d', options);
  if (!ctx) throw new FaceCropError('Canvas 2D is not supported in this browser.', 'decode-failed');
  return ctx;
};

async function decodeImage(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Older Safari rejects the options bag. Fall back to an <img> element below.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => {} };
  } catch {
    throw new FaceCropError('The photo could not be opened.', 'decode-failed');
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Decodes a photo file into a working canvas, capped to MAX_WORKING_EDGE. */
export async function loadPhoto(file: Blob): Promise<LoadedPhoto> {
  if (!file.type.startsWith('image/')) {
    throw new FaceCropError('Please choose an image file.', 'not-an-image');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new FaceCropError('This photo is too large.', 'too-large');
  }

  const decoded = await decodeImage(file);
  try {
    if (!decoded.width || !decoded.height) {
      throw new FaceCropError('The photo could not be opened.', 'decode-failed');
    }
    const scale = Math.min(1, MAX_WORKING_EDGE / Math.max(decoded.width, decoded.height));
    const canvas = createCanvas(decoded.width * scale, decoded.height * scale);
    const ctx = get2d(canvas);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
    return { canvas, width: canvas.width, height: canvas.height };
  } finally {
    decoded.release();
  }
}

async function detectWithNativeApi(photo: LoadedPhoto): Promise<Box | null> {
  const Ctor = (globalThis as unknown as { FaceDetector?: NativeFaceDetectorCtor }).FaceDetector;
  if (!Ctor) return null;
  try {
    const faces = await new Ctor({ fastMode: true, maxDetectedFaces: 5 }).detect(photo.canvas);
    if (!faces.length) return null;
    // Pick the largest face: in a family photo, the child is usually the subject.
    const largest = faces.reduce((a, b) =>
      a.boundingBox.width * a.boundingBox.height >= b.boundingBox.width * b.boundingBox.height ? a : b,
    );
    const { x, y, width, height } = largest.boundingBox;
    return { x, y, width, height };
  } catch {
    return null;
  }
}

function detectWithSkinTone(photo: LoadedPhoto): Box | null {
  const scale = Math.min(1, ANALYSIS_EDGE / Math.max(photo.width, photo.height));
  const canvas = createCanvas(photo.width * scale, photo.height * scale);
  const ctx = get2d(canvas, { willReadFrequently: true });
  ctx.drawImage(photo.canvas, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const box = detectFaceBoxFromPixels(data, canvas.width, canvas.height);
  if (!box) return null;
  const sx = photo.width / canvas.width;
  const sy = photo.height / canvas.height;
  return { x: box.x * sx, y: box.y * sy, width: box.width * sx, height: box.height * sy };
}

/** Suggests the face oval for a photo, trying the best method available. */
export async function detectFace(photo: LoadedPhoto): Promise<{ region: FaceRegion; method: DetectionMethod }> {
  const nativeBox = await detectWithNativeApi(photo);
  if (nativeBox) {
    return { region: clampRegion(regionFromFaceBox(nativeBox), photo.width, photo.height), method: 'native' };
  }
  const skinBox = detectWithSkinTone(photo);
  if (skinBox) {
    return { region: clampRegion(regionFromFaceBox(skinBox), photo.width, photo.height), method: 'skin' };
  }
  return { region: defaultFaceRegion(photo.width, photo.height), method: 'fallback' };
}

/**
 * Renders the oval cut-out as a square, transparent image. It draws at 2x
 * and downsamples for smooth edges. The edge is feathered with the canvas
 * shadow-blur trick, which works in every browser (unlike `ctx.filter`).
 */
export function renderFaceCrop(photo: LoadedPhoto, region: FaceRegion, options: RenderOptions = {}): string {
  const size = options.size ?? DEFAULT_OUTPUT_SIZE;
  const featherShare = options.feather ?? 0.025;
  const work = size * 2;

  // Fit the oval's height to the canvas, leaving a small margin for the feather.
  const margin = work * 0.02;
  const scale = (work / 2 - margin) / region.ry;
  const ovalRx = region.rx * scale;
  const ovalRy = region.ry * scale;
  const feather = Math.max(1, work * featherShare);

  // 1. Draw the photo, centred on the region.
  const workCanvas = createCanvas(work, work);
  const ctx = get2d(workCanvas);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.setTransform(scale, 0, 0, scale, work / 2 - region.cx * scale, work / 2 - region.cy * scale);
  ctx.drawImage(photo.canvas, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // 2. Build a feathered oval mask. Draw the ellipse far off-canvas and shift
  //    only its blurred shadow into view, which gives a soft edge.
  const maskCanvas = createCanvas(work, work);
  const mask = get2d(maskCanvas);
  const offset = work * 4;
  mask.shadowColor = '#000';
  mask.shadowBlur = feather;
  mask.shadowOffsetX = offset;
  mask.fillStyle = '#000';
  mask.beginPath();
  mask.ellipse(work / 2 - offset, work / 2, Math.max(1, ovalRx - feather / 2), Math.max(1, ovalRy - feather / 2), 0, 0, Math.PI * 2);
  mask.fill();

  // 3. Keep only the photo pixels inside the mask.
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(maskCanvas, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  // 4. Downsample to the output size for anti-aliasing.
  const out = createCanvas(size, size);
  const outCtx = get2d(out);
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.drawImage(workCanvas, 0, 0, size, size);

  // WebP keeps transparency at a fraction of PNG's size. Browsers that cannot
  // encode it silently return PNG, which is fine too.
  let dataUrl = out.toDataURL('image/webp', 0.9);
  if (!dataUrl.startsWith('data:image/webp')) dataUrl = out.toDataURL('image/png');
  if (!dataUrl.startsWith('data:image/')) {
    throw new FaceCropError('The photo could not be prepared.', 'encode-failed');
  }
  return dataUrl;
}

/** One call: decode, detect, and render. */
export async function cropFaceFromFile(file: Blob, options?: RenderOptions): Promise<FaceCropResult> {
  const photo = await loadPhoto(file);
  const { region, method } = await detectFace(photo);
  return { dataUrl: renderFaceCrop(photo, region, options), region, method, photo };
}
