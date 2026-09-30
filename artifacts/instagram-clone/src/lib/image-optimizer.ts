// ─── Client-side Image Optimization & Compression Engine ──────────────────────────

export interface OptimizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputType?: "image/jpeg" | "image/webp" | "image/png";
}

export interface OptimizedImageResult {
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export async function optimizeImage(
  file: File,
  options: OptimizeImageOptions = {}
): Promise<OptimizedImageResult> {
  const {
    maxWidth = 1600,
    maxHeight = 600,
    quality = 0.85,
    outputType = "image/jpeg",
  } = options;

  return new Promise((resolve, reject) => {
    // 1. File type validation
    if (!file.type.startsWith("image/")) {
      reject(new Error("Selected file is not a valid image format."));
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;

      // 2. Aspect Ratio Preserving Scaling
      if (width > maxWidth || height > maxHeight) {
        const widthRatio = maxWidth / width;
        const heightRatio = maxHeight / height;
        const bestRatio = Math.min(widthRatio, heightRatio);

        width = Math.round(width * bestRatio);
        height = Math.round(height * bestRatio);
      }

      // 3. Canvas Rendering & Compression
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not initialize 2D canvas context."));
        return;
      }

      // Fill white background for transparent PNGs converted to JPEG
      if (outputType === "image/jpeg") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL(outputType, quality);
      const approxSizeBytes = Math.round((dataUrl.length * 3) / 4);

      resolve({
        dataUrl,
        mimeType: outputType,
        width,
        height,
        sizeBytes: approxSizeBytes,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load and decode image data."));
    };

    img.src = objectUrl;
  });
}
