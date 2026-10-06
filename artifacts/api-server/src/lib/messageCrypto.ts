import crypto from "crypto";

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || "whiterchat-secret-encryption-master-key-32b";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypt a text payload using AES-256-GCM with a random IV and auth tag.
 */
export function encryptPayload(text: string): string {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt an AES-256-GCM encrypted payload.
 */
export function decryptPayload(cipherString: string): string | null {
  try {
    const parts = cipherString.split(":");
    if (parts.length !== 3) return null;
    
    const iv = Buffer.from(parts[0], "hex");
    const tag = Buffer.from(parts[1], "hex");
    const encrypted = Buffer.from(parts[2], "hex");
    
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err) {
    return null;
  }
}

/**
 * Normalize an answer for case-insensitivity, whitespace, and unicode.
 */
export function normalizeAnswer(ans: string): string {
  if (!ans) return "";
  return ans
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove Arabic diacritics if any
    .replace(/[^\w\s\u0600-\u06FF]/gi, "") // remove punctuation
    .replace(/\s+/g, " ");
}

/**
 * Compute an HMAC-SHA256 solution hash.
 */
export function hashSolution(answer: string, salt: string = "whiterchat-puzzle"): string {
  const norm = normalizeAnswer(answer);
  const key = getEncryptionKey();
  return crypto.createHmac("sha256", key).update(`${salt}:${norm}`).digest("hex");
}

/**
 * Timing-safe solution verification.
 */
export function verifySolution(candidate: string, storedHash: string, salt: string = "whiterchat-puzzle"): boolean {
  if (!candidate || !storedHash) return false;
  const candidateHash = hashSolution(candidate, salt);
  try {
    return crypto.timingSafeEqual(Buffer.from(candidateHash, "hex"), Buffer.from(storedHash, "hex"));
  } catch {
    return false;
  }
}

const MEMORY_CARD_SYMBOLS = ["🍎", "⭐", "🐶", "🚀", "💎", "🔥", "🍀", "🍕", "⚡", "🎸", "🌈", "👑"];

export function generateMemoryChallengeCards(length: number = 4): string[] {
  const safeLength = Math.max(3, Math.min(length, 8));
  const shuffled = [...MEMORY_CARD_SYMBOLS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, safeLength);
}
