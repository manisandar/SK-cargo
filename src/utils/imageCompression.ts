import imageCompression from 'browser-image-compression';

export async function compressPhoto(file: File): Promise<Blob> {
  const options = {
    maxSizeMB: 0.3, // 300 KB max
    maxWidthOrHeight: 1280, // ~1280px long side
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.85,
  };

  try {
    const compressed = await imageCompression(file, options);
    return compressed;
  } catch (err) {
    console.warn('Web worker compression failed, retrying without worker:', err);
    // Fallback without worker
    const fallbackOptions = { ...options, useWebWorker: false };
    return await imageCompression(file, fallbackOptions);
  }
}

