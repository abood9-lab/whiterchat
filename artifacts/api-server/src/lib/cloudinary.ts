import { v2 as cloudinary } from "cloudinary";
import { logger } from "./logger";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface MediaValidationResult {
  valid: boolean;
  detectedType?: string;
  error?: string;
}

/**
 * Validates buffer magic bytes against expected media formats.
 */
export function validateMediaMagicBytes(buffer: Buffer, claimedMime: string): MediaValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Empty file payload." };
  }

  const hexHeader = buffer.subarray(0, 16).toString("hex").toUpperCase();
  const textHeader = buffer.subarray(0, 512).toString("utf-8");

  // Reject dangerous script / executable headers immediately
  const dangerousPatterns = [
    "<script",
    "<?php",
    "#!/bin/",
    "<!doctype html",
    "<html",
    "eval(",
    "javascript:",
  ];
  const lowerText = textHeader.toLowerCase();
  for (const pattern of dangerousPatterns) {
    if (lowerText.includes(pattern)) {
      return { valid: false, error: "Executable or dangerous content detected in media payload." };
    }
  }

  // 1. JPEG: FF D8 FF
  if (hexHeader.startsWith("FFD8FF")) {
    return { valid: true, detectedType: "image/jpeg" };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (hexHeader.startsWith("89504E470D0A1A0A")) {
    return { valid: true, detectedType: "image/png" };
  }

  // 3. GIF: 47 49 46 38 37 61 or 47 49 46 38 39 61
  if (hexHeader.startsWith("47494638")) {
    return { valid: true, detectedType: "image/gif" };
  }

  // 4. WebP: 52 49 46 46 (RIFF) + 57 45 42 50 (WEBP at offset 8)
  if (hexHeader.startsWith("52494646") && buffer.length >= 12) {
    const riffType = buffer.subarray(8, 12).toString("ascii");
    if (riffType === "WEBP") {
      return { valid: true, detectedType: "image/webp" };
    }
    if (riffType === "WAVE") {
      return { valid: true, detectedType: "audio/wav" };
    }
  }

  // 5. MP4 / MOV / M4A: contains 'ftyp' at offset 4
  if (buffer.length >= 8) {
    const ftyp = buffer.subarray(4, 8).toString("ascii");
    if (ftyp === "ftyp") {
      return { valid: true, detectedType: "video/mp4" };
    }
  }

  // 6. WebM / Matroska: 1A 45 DF A3
  if (hexHeader.startsWith("1A45DFA3")) {
    return { valid: true, detectedType: "video/webm" };
  }

  // 7. MP3: ID3 (49 44 33) or MPEG sync frame (FF FB / FF F3 / FF F2 / FF E3)
  if (hexHeader.startsWith("494433") || hexHeader.startsWith("FFFB") || hexHeader.startsWith("FFF3") || hexHeader.startsWith("FFF2")) {
    return { valid: true, detectedType: "audio/mpeg" };
  }

  // 8. Ogg: 4F 67 67 53 ('OggS')
  if (hexHeader.startsWith("4F676753")) {
    return { valid: true, detectedType: "audio/ogg" };
  }

  // 9. PDF: %PDF (25 50 44 46)
  if (hexHeader.startsWith("25504446")) {
    return { valid: true, detectedType: "application/pdf" };
  }

  // 10. Sanitized SVG (if claimed)
  if (claimedMime === "image/svg+xml" || textHeader.includes("<svg")) {
    if (
      lowerText.includes("<script") ||
      lowerText.includes("onload=") ||
      lowerText.includes("onerror=") ||
      lowerText.includes("javascript:") ||
      lowerText.includes("xlink:href=\"javascript")
    ) {
      return { valid: false, error: "SVG contains forbidden scripting elements." };
    }
    return { valid: true, detectedType: "image/svg+xml" };
  }

  // If MIME type is audio/webm (voice notes recorded in browser)
  if (claimedMime.includes("audio/webm") || claimedMime.includes("audio/ogg")) {
    return { valid: true, detectedType: claimedMime };
  }

  return { valid: false, error: "Unsupported or invalid file signature." };
}

export async function uploadBase64(
  data: string,
  claimedMimeType: string,
  folder: string = "whiterchat"
): Promise<{ url: string; publicId: string; resourceType: string }> {
  // 1. Extract raw base64 payload
  let base64Content = data;
  let effectiveMime = claimedMimeType;

  if (data.startsWith("data:")) {
    const matches = data.match(/^data:([a-zA-Z0-9\/+.-]+);base64,(.+)$/);
    if (matches) {
      effectiveMime = matches[1];
      base64Content = matches[2];
    } else {
      const commaIdx = data.indexOf(",");
      if (commaIdx !== -1) {
        base64Content = data.slice(commaIdx + 1);
      }
    }
  }

  const buffer = Buffer.from(base64Content, "base64");

  // 2. Enforce file size limits
  const isVideo = effectiveMime.startsWith("video");
  const maxBytes = isVideo ? 60 * 1024 * 1024 : 15 * 1024 * 1024; // 60MB video, 15MB others

  if (buffer.length > maxBytes) {
    throw new Error(`File exceeds maximum permitted size of ${isVideo ? "60MB" : "15MB"}.`);
  }

  // 3. Inspect magic bytes
  const validation = validateMediaMagicBytes(buffer, effectiveMime);
  if (!validation.valid) {
    throw new Error(`Invalid file format: ${validation.error || "File signature verification failed."}`);
  }

  const resourceType = isVideo
    ? "video"
    : effectiveMime.startsWith("audio")
    ? "video"
    : effectiveMime.startsWith("image")
    ? "image"
    : "raw";

  const dataUri = `data:${validation.detectedType || effectiveMime};base64,${base64Content}`;

  // 4. Upload to Cloudinary if configured
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    try {
      const result = await cloudinary.uploader.upload(dataUri, {
        folder,
        resource_type: resourceType as "video" | "image" | "raw" | "auto",
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        resourceType,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cloudinary upload failed";
      logger.error({ err, folder }, `Cloudinary upload error: ${msg}`);
      throw new Error(`Media upload failed: ${msg}`);
    }
  }

  // 5. Fallback in development / mock environment
  const mockId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  return {
    url: dataUri,
    publicId: mockId,
    resourceType,
  };
}
