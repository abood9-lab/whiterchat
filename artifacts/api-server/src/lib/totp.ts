import crypto from "crypto";

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Encodes a buffer into a standard RFC 4648 Base32 string (without padding)
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes a standard Base32 string into a Buffer
 */
export function base32Decode(base32: string): Buffer {
  const clean = base32.replace(/=+$/, "").toUpperCase().replace(/[\s-]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean[i]);
    if (val === -1) continue; // ignore unknown chars

    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates an RFC 6238 compliant Base32 secret for Google Authenticator (default 20 bytes = 160 bits)
 */
export function generateTotpSecret(byteLength: number = 20): string {
  const randomBytes = crypto.randomBytes(byteLength);
  return base32Encode(randomBytes);
}

/**
 * Computes an RFC 6238 6-digit TOTP token for a given counter
 */
export function computeHotp(secretBuffer: Buffer, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter), 0);

  const hmac = crypto.createHmac("sha1", secretBuffer);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  // Dynamic truncation
  const offset = digest[digest.length - 1] & 0x0f;
  const codeInt =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const token = (codeInt % 1_000_000).toString().padStart(6, "0");
  return token;
}

/**
 * Verifies a 6-digit Google Authenticator TOTP token with +/- 1 time step tolerance (30 seconds window)
 */
export function verifyTotpToken(token: string, secretBase32: string, windowSteps: number = 1): boolean {
  if (!token || !secretBase32) return false;
  const cleanToken = token.trim().replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleanToken)) return false;

  const secretBuffer = base32Decode(secretBase32);
  if (secretBuffer.length === 0) return false;

  const timeStep = 30; // 30 seconds
  const currentCounter = Math.floor(Date.now() / 1000 / timeStep);

  for (let delta = -windowSteps; delta <= windowSteps; delta++) {
    const calculatedToken = computeHotp(secretBuffer, currentCounter + delta);
    if (crypto.timingSafeEqual(Buffer.from(calculatedToken), Buffer.from(cleanToken))) {
      return true;
    }
  }

  return false;
}

/**
 * Formats a key URI for QR code scanning in Google Authenticator
 */
export function generateKeyUri(accountName: string, issuer: string, secret: string): string {
  const encIssuer = encodeURIComponent(issuer);
  const encAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encIssuer}:${encAccount}?secret=${secret}&issuer=${encIssuer}&algorithm=SHA1&digits=6&period=30`;
}
