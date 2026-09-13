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
        const MAX_DIMENSION = 2000;
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
          let quality = 0.88;
          let outputDataUrl = canvas.toDataURL('image/webp', quality);
          if (!outputDataUrl.startsWith('data:image/webp')) {
            outputDataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
          const ext = outputDataUrl.startsWith('data:image/webp') ? 'webp' : 'jpg';
          return { dataUrl: outputDataUrl, filename: `${baseName}.${ext}` };
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

  const rawDataUrl = await readFileSafely(file, fallbackPreviewUrl);
  return { dataUrl: rawDataUrl, filename: file.name };
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
