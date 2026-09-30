import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";

let ephemeralDevSecret: string | null = null;

export function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (s && s.trim()) {
    if (process.env.NODE_ENV === "production" && s.trim().length < 32) {
      throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET must be at least 32 characters long in production.");
    }
    return s.trim();
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is mandatory in production.");
  }

  // In non-production environments (dev/test), never use a static known hardcoded secret.
  // Generate an ephemeral cryptographic random secret per process boot.
  if (!ephemeralDevSecret) {
    ephemeralDevSecret = crypto.randomBytes(32).toString("hex");
    console.warn("⚠️ [SECURITY WARNING] JWT_SECRET is not configured. Generated an ephemeral random key for this session. Set JWT_SECRET in .env for persistent authentication.");
  }
  return ephemeralDevSecret;
}

const SALT_ROUNDS = 10;

export interface JwtPayload {
  userId: string;
  username: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d", algorithm: "HS256" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] }) as JwtPayload;
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function refreshTokenExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

export interface AuthRequest extends Request {
  userId?: string;
  username?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    req.username = payload.username;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = verifyToken(token);
      req.userId = payload.userId;
      req.username = payload.username;
    } catch { /* ignore */ }
  }
  next();
}
