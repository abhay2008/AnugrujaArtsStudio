/** Longest edge kept when re-encoding an upload. */
export const MAX_IMAGE_DIMENSION = 2000;

/** Encoding quality for WebP/JPEG uploads. */
export const UPLOAD_QUALITY = 0.88;

/**
 * Hard ceiling for the encoded data URL that becomes the `/api/upload` body.
 *
 * Vercel rejects any request body over 4.5 MB with a bare
 * `413 FUNCTION_PAYLOAD_TOO_LARGE` *before* the route handler runs, and base64
 * inflates binary payloads by a third — so a photo that slips past the client
 * at 5 MB never reaches the server and the admin's publish silently dies.
 * Re-encoding until the payload sits well under that line is what makes
 * uploads reliable in production.
 */
export const MAX_UPLOAD_DATA_URL_LENGTH = 3_145_728; // 3 MiB of base64 text

/** Encode qualities tried from best quality down until the payload fits. */
const QUALITY_LADDER = [0.78, 0.68, 0.58, 0.48];
/** Scale factors tried (relative to the source canvas) once quality bottoms out. */
const SCALE_LADDER = [1, 0.8, 0.65, 0.5];

export function isWithinUploadLimit(dataUrl: string): boolean {
  return dataUrl.length <= MAX_UPLOAD_DATA_URL_LENGTH;
}

function scaleCanvas(canvas: HTMLCanvasElement, factor: number): HTMLCanvasElement {
  const next = document.createElement('canvas');
  next.width = Math.max(1, Math.round(canvas.width * factor));
  next.height = Math.max(1, Math.round(canvas.height * factor));
  const ctx = next.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, next.width, next.height);
  }
  return next;
}

function encodeOnce(canvas: HTMLCanvasElement, quality: number): string {
  const webp = canvas.toDataURL('image/webp', quality);
  if (webp.startsWith('data:image/webp')) return webp;
  return canvas.toDataURL('image/jpeg', quality);
}

/** The caller's preferred quality first, then the descending ladder. */
function qualityLadder(preferred: number): number[] {
  const ladder = [preferred, ...QUALITY_LADDER];
  return ladder.filter((q, i) => ladder.indexOf(q) === i);
}

/**
 * Encode a finished canvas as the upload payload. WebP where the browser
 * supports it, JPEG otherwise — the same choice the optimizer makes, so a
 * cropped export and an untouched original arrive in the same format.
 *
 * Quality, and then resolution, are stepped down until the encoded body fits
 * under {@link MAX_UPLOAD_DATA_URL_LENGTH}, so no caller can hand the upload
 * route something the platform will reject outright.
 */
export function encodeCanvasToDataUrl(
  canvas: HTMLCanvasElement,
  sourceName: string,
  quality = UPLOAD_QUALITY
): { dataUrl: string; filename: string } {
  let best = '';

  outer: for (const scale of SCALE_LADDER) {
    const source = scale === 1 ? canvas : scaleCanvas(canvas, scale);
    for (const q of qualityLadder(quality)) {
      const dataUrl = encodeOnce(source, q);
      if (!best || dataUrl.length < best.length) best = dataUrl;
      if (isWithinUploadLimit(dataUrl)) break outer;
    }
  }

  const dataUrl = best || encodeOnce(canvas, quality);
  const baseName =
    (sourceName || 'artwork')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40) || 'artwork';
  const ext = dataUrl.startsWith('data:image/webp') ? 'webp' : 'jpg';
  return { dataUrl, filename: `${baseName}.${ext}` };
}

/**
 * High performance image optimization for desktop and mobile uploads.
 * Preserves ultra high resolution art details while resizing/compressing
 * images so payloads stay well within API limits and fast cloud uploads.
 */
export async function optimizeImageForUpload(
  file: File,
  fallbackPreviewUrl?: string
): Promise<{
  dataUrl: string;
  filename: string;
}> {
  const isImage =
    file.type.startsWith('image/') ||
    /\.(jpe?g|png|webp|avif|gif|heic|heif)$/i.test(file.name);
  const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);

  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    !isImage ||
    isSvg
  ) {
    const rawDataUrl = await readFileSafely(file, fallbackPreviewUrl);
    assertUploadable(rawDataUrl, file);
    return { dataUrl: rawDataUrl, filename: file.name };
  }

  let objectUrl = fallbackPreviewUrl || '';
  let createdObjectUrl = false;

  try {
    if (!objectUrl && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      try {
        objectUrl = URL.createObjectURL(file);
        createdObjectUrl = true;
      } catch (e) {
        console.warn('Could not create object URL from file:', e);
      }
    }

    if (objectUrl) {
      try {
        const img = await loadImage(objectUrl);
        const MAX_DIMENSION = MAX_IMAGE_DIMENSION;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to efficient WebP or JPEG
          return encodeCanvasToDataUrl(canvas, file.name);
        }
      } catch (drawErr) {
        console.warn('Canvas optimization fallback:', drawErr);
      }
    }
  } finally {
    if (createdObjectUrl && objectUrl) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {}
    }
  }

  // The browser could not re-encode this photo (undecodable format, canvas
  // refusal). Sending it raw is what used to blow past the platform's body
  // limit and fail the publish with an opaque 413 — refuse it here instead,
  // with a message the admin can act on.
  const rawDataUrl = await readFileSafely(file, fallbackPreviewUrl);
  assertUploadable(rawDataUrl, file);
  return { dataUrl: rawDataUrl, filename: file.name };
}

function assertUploadable(dataUrl: string, file: File): void {
  if (isWithinUploadLimit(dataUrl)) return;
  const mb = (dataUrl.length / (1024 * 1024)).toFixed(1);
  throw new Error(
    `“${file.name}” is ${mb} MB and could not be compressed in this browser, ` +
      'so it cannot be published (uploads are capped at 3 MB). Re-export it ' +
      'as a JPG or PNG under 12 MB and try again.'
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

async function readFileSafely(file: File, fallbackUrl?: string): Promise<string> {
  if (fallbackUrl && fallbackUrl.startsWith('data:')) return fallbackUrl;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader did not return a string'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });
}
