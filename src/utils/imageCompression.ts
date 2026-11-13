import imageCompression from 'browser-image-compression';

/**
 * CONFIGURATION SETTINGS FOR SK CARGO PHOTO COMPRESSION
 *
 * Warehouse Intake & Staff Operations:
 * Volume is typically 10-50 parcels per day.
 * Target: ~150-300 KB per photo while maintaining barcode/label readability.
 *
 * TWEAKING GUIDE:
 * - If parcel labels/small text need more clarity: increase `maxWidthOrHeight` to 1600.
 * - If photos need to be even lighter: lower `maxSizeMB` to 0.2 or `initialQuality` to 0.75.
 * - To force JPEG instead of WebP: change `preferredMimeType` to 'image/jpeg'.
 */
export const PHOTO_COMPRESSION_CONFIG = {
  /** Maximum pixel dimension for width or height (maintains original aspect ratio) */
  maxWidthOrHeight: 1280,
  /** Maximum file size in megabytes (0.3 MB = ~300 KB target) */
  maxSizeMB: 0.3,
  /** Initial compression quality (0.0 - 1.0) before iteration */
  initialQuality: 0.82,
  /**
   * Automatically normalizes photo orientation based on EXIF while stripping
   * heavy camera metadata (GPS, lens info, thumbnails) to save 10-30 KB per photo.
   */
  preserveExif: false,
  /** Offloads CPU-intensive compression to a Web Worker thread to keep the UI smooth */
  useWebWorker: true,
  /** Maximum iterative compression passes to meet the target size */
  maxIteration: 10,
  /** Preferred modern format (WebP provides 25-35% better compression at same quality) */
  preferredMimeType: 'image/webp' as const,
  /** Safe fallback format for older browsers or environments that cannot encode WebP */
  fallbackMimeType: 'image/jpeg' as const,
};

/**
 * Settings for generating fast, ultra-compact thumbnail previews (~15-30 KB)
 * used in admin list views and cards without fetching full photos.
 */
export const THUMBNAIL_CONFIG = {
  maxWidthOrHeight: 200,
  maxSizeMB: 0.03, // ~30 KB
  initialQuality: 0.70,
  preserveExif: false,
  useWebWorker: true,
  maxIteration: 5,
  preferredMimeType: 'image/webp' as const,
  fallbackMimeType: 'image/jpeg' as const,
};

/**
 * Detects whether the current browser runtime supports WebP canvas encoding.
 * WebP encoding is supported on iOS Safari 14+, Chrome 32+, Firefox 65+, and Edge.
 */
export function isWebPEncodingSupported(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
}

/**
 * Checks if a file or blob is an Apple HEIC/HEIF image.
 */
export function isHeicFile(file: File | Blob): boolean {
  const type = file.type?.toLowerCase() || '';
  if (type.includes('heic') || type.includes('heif')) return true;
  if ('name' in file && typeof file.name === 'string') {
    const name = file.name.toLowerCase();
    return name.endsWith('.heic') || name.endsWith('.heif');
  }
  return false;
}

export interface CompressPhotoOptions {
  maxWidthOrHeight?: number;
  maxSizeMB?: number;
  initialQuality?: number;
  preserveExif?: boolean;
  useWebWorker?: boolean;
  maxIteration?: number;
  preferredMimeType?: string;
  fallbackMimeType?: string;
}

/**
 * Compresses a warehouse intake parcel photo with best-practice optimizations:
 * - Aspect ratio preserved and auto-rotated by EXIF.
 * - Strips unnecessary EXIF metadata.
 * - Targets WebP format first, falling back to JPEG if unsupported.
 * - Web worker execution with seamless main-thread fallback if worker fails.
 * - Friendly error handling for HEIC files.
 * - Logs compression statistics in development mode.
 *
 * @param fileOrBlob - File or Blob captured from camera input
 * @param customOptions - Optional overrides for compression constants
 * @returns Compressed Blob (WebP or JPEG)
 */
export async function compressPhoto(
  fileOrBlob: File | Blob,
  customOptions?: CompressPhotoOptions
): Promise<Blob> {
  const file =
    fileOrBlob instanceof File
      ? fileOrBlob
      : new File([fileOrBlob], 'photo.jpg', {
          type: fileOrBlob.type || 'image/jpeg',
          lastModified: Date.now(),
        });

  const isHeic = isHeicFile(file);
  const supportsWebP = isWebPEncodingSupported();

  const chosenMimeType = supportsWebP
    ? (customOptions?.preferredMimeType ?? PHOTO_COMPRESSION_CONFIG.preferredMimeType)
    : (customOptions?.fallbackMimeType ?? PHOTO_COMPRESSION_CONFIG.fallbackMimeType);

  const options = {
    maxWidthOrHeight: customOptions?.maxWidthOrHeight ?? PHOTO_COMPRESSION_CONFIG.maxWidthOrHeight,
    maxSizeMB: customOptions?.maxSizeMB ?? PHOTO_COMPRESSION_CONFIG.maxSizeMB,
    initialQuality: customOptions?.initialQuality ?? PHOTO_COMPRESSION_CONFIG.initialQuality,
    preserveExif: customOptions?.preserveExif ?? PHOTO_COMPRESSION_CONFIG.preserveExif,
    maxIteration: customOptions?.maxIteration ?? PHOTO_COMPRESSION_CONFIG.maxIteration,
    useWebWorker: customOptions?.useWebWorker ?? PHOTO_COMPRESSION_CONFIG.useWebWorker,
    fileType: chosenMimeType,
  };

  try {
    let compressed: File;

    try {
      compressed = await imageCompression(file, options);
    } catch (workerErr) {
      if (options.useWebWorker) {
        console.warn('Web worker compression failed, retrying on main thread:', workerErr);
        compressed = await imageCompression(file, { ...options, useWebWorker: false });
      } else {
        throw workerErr;
      }
    }

    // Verify if WebP was requested but browser silently converted to PNG/JPEG or failed
    if (chosenMimeType === 'image/webp' && compressed.type !== 'image/webp') {
      // Browser didn't encode as WebP; retry with explicit JPEG
      console.warn(`Browser produced ${compressed.type} instead of WebP, normalizing to JPEG`);
      compressed = await imageCompression(file, {
        ...options,
        fileType: PHOTO_COMPRESSION_CONFIG.fallbackMimeType,
        useWebWorker: false,
      });
    }

    if (import.meta.env.DEV) {
      const originalKB = (file.size / 1024).toFixed(1);
      const compressedKB = (compressed.size / 1024).toFixed(1);
      const savingsPct =
        file.size > 0 ? (((file.size - compressed.size) / file.size) * 100).toFixed(0) : '0';
      console.log(
        `📸 [Photo Compressed] Original: ${originalKB} KB ➔ Final: ${compressedKB} KB (${savingsPct}% saved) | Format: ${compressed.type}`
      );
    }

    return compressed;
  } catch (err: unknown) {
    if (isHeic) {
      throw new Error(
        "This photo is in HEIC/HEIF format and cannot be decoded by your browser. Please change your iPhone Camera Settings > Formats to 'Most Compatible' (JPEG) or select a JPG/PNG photo."
      );
    }

    // Attempt one last recovery pass with JPEG on main thread if WebP was requested
    if (options.fileType !== PHOTO_COMPRESSION_CONFIG.fallbackMimeType) {
      try {
        console.warn('WebP compression failed; attempting fallback JPEG pass:', err);
        const fallbackCompressed = await imageCompression(file, {
          ...options,
          fileType: PHOTO_COMPRESSION_CONFIG.fallbackMimeType,
          useWebWorker: false,
        });

        if (import.meta.env.DEV) {
          console.log(
            `📸 [Photo Compression Fallback] Recovered with JPEG: ${(fallbackCompressed.size / 1024).toFixed(1)} KB`
          );
        }
        return fallbackCompressed;
      } catch (fallbackErr) {
        console.error('Fallback JPEG compression also failed:', fallbackErr);
      }
    }

    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Photo compression failed: ${detail}. Please retake or choose another photo.`);
  }
}

/**
 * Generates an ultra-compact thumbnail (~200px, <30 KB) from a full photo.
 * Ideal for high-speed admin list views and thumbnail grids.
 *
 * @param fileOrBlob - Full resolution or compressed photo
 * @returns Compact thumbnail Blob
 */
export async function generateThumbnail(fileOrBlob: File | Blob): Promise<Blob> {
  const file =
    fileOrBlob instanceof File
      ? fileOrBlob
      : new File([fileOrBlob], 'thumb.jpg', {
          type: fileOrBlob.type || 'image/jpeg',
          lastModified: Date.now(),
        });

  const supportsWebP = isWebPEncodingSupported();
  const fileType = supportsWebP
    ? THUMBNAIL_CONFIG.preferredMimeType
    : THUMBNAIL_CONFIG.fallbackMimeType;

  const options = {
    maxWidthOrHeight: THUMBNAIL_CONFIG.maxWidthOrHeight,
    maxSizeMB: THUMBNAIL_CONFIG.maxSizeMB,
    initialQuality: THUMBNAIL_CONFIG.initialQuality,
    preserveExif: THUMBNAIL_CONFIG.preserveExif,
    maxIteration: THUMBNAIL_CONFIG.maxIteration,
    useWebWorker: THUMBNAIL_CONFIG.useWebWorker,
    fileType,
  };

  try {
    return await imageCompression(file, options);
  } catch {
    // Retry on main thread if worker fails
    return await imageCompression(file, { ...options, useWebWorker: false });
  }
}

/**
 * Compresses an intake photo and simultaneously generates its 200px thumbnail.
 *
 * @param fileOrBlob - Source photo
 * @returns Object containing both compressed full photo and thumbnail blobs
 */
export async function compressPhotoWithThumbnail(
  fileOrBlob: File | Blob
): Promise<{ photo: Blob; thumbnail: Blob }> {
  const photo = await compressPhoto(fileOrBlob);
  const thumbnail = await generateThumbnail(photo);
  return { photo, thumbnail };
}
