import type { Request, Response, NextFunction } from "express";
import { User, AuditLog, type IUser } from "@workspace/db";
import { verifyToken, type AuthRequest } from "../lib/auth";
import { logger } from "../lib/logger";

export interface AdminRequest extends AuthRequest {
  adminUser?: IUser;
  adminRole?: string;
}

export const ADMIN_ROLES = ["superadmin", "admin", "moderator", "support"] as const;
export type AdminRoleType = (typeof ADMIN_ROLES)[number];

export async function requireAdmin(
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Missing authentication token" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    req.username = payload.username;

    const user = await User.findById(payload.userId);
    if (!user) {
      res.status(401).json({ error: "Unauthorized: User not found" });
      return;
    }

    if (user.isDeactivated) {
      res.status(403).json({ error: "Forbidden: Account is deactivated" });
      return;
    }

    if (user.isSuspended) {
      res.status(403).json({ error: `Forbidden: Account is suspended (${user.suspensionReason || "Violated terms"})` });
      return;
    }

    let role = (user.role || "user").toLowerCase();
    if (role === "super_admin") role = "superadmin";

    if (!ADMIN_ROLES.includes(role as AdminRoleType)) {
      res.status(403).json({ error: "Forbidden: Administrative privileges required" });
      return;
    }

    req.adminUser = user;
    req.adminRole = role;
    next();
  } catch (err: any) {
    logger.warn({ err: err.message }, "Admin authorization failed");
    res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
}

export function requireAdminRole(allowedRoles: AdminRoleType[]) {
  return (req: AdminRequest, res: Response, next: NextFunction): void => {
    if (!req.adminUser || !req.adminRole) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!allowedRoles.includes(req.adminRole as AdminRoleType)) {
      res.status(403).json({
        error: `Forbidden: This action requires one of the following roles: ${allowedRoles.join(", ")}`,
      });
      return;
    }

    next();
  };
}

export async function logAdminAction(opts: {
  adminUser: IUser;
  action: string;
  targetType: "user" | "post" | "reel" | "story" | "comment" | "report" | "feedback" | "security" | "settings" | "system" | "verification" | "group" | "plan";
  targetId?: string;
  targetSummary?: string;
  reason?: string;
  metadata?: Record<string, any>;
  req?: Request;
}): Promise<void> {
  try {
    const ip = opts.req ? (opts.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || opts.req.ip : undefined;
    const userAgent = opts.req ? opts.req.headers["user-agent"] : undefined;

    await AuditLog.create({
      adminId: opts.adminUser._id,
      adminUsername: opts.adminUser.username,
      adminRole: opts.adminUser.role || "admin",
      action: opts.action,
      targetType: opts.targetType,
      targetId: opts.targetId || null,
      targetSummary: opts.targetSummary || null,
      reason: opts.reason || null,
      metadata: opts.metadata || {},
      ipAddress: ip,
      userAgent: userAgent,
    });
  } catch (err) {
    logger.error({ err }, "Failed to create audit log entry");
  }
}
