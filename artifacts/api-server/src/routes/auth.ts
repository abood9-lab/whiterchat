import { Router, type IRouter, type Request } from "express";
import { User, RefreshToken, OtpVerification } from "@workspace/db";
import {
  hashPassword, comparePassword, signToken,
  generateRefreshToken, hashRefreshToken, refreshTokenExpiresAt,
  requireAuth, type AuthRequest,
} from "../lib/auth";
import { authLimiter, sessionLimiter } from "../lib/security";
import { sendOtpEmail, generateOtpCode, hashOtpCode } from "../lib/email";
import { verifyTotpToken } from "../lib/totp";
import crypto from "crypto";

const router: IRouter = Router();

function getClientInfo(req: Request) {
  const userAgent = req.headers["user-agent"] || "Unknown Browser";
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";
  
  let browser = "Web Browser";
  if (userAgent.includes("Chrome")) browser = "Chrome";
  else if (userAgent.includes("Safari")) browser = "Safari";
  else if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Edge")) browser = "Edge";

  let os = "Desktop";
  if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("Mac OS")) os = "macOS";
  else if (userAgent.includes("Windows")) os = "Windows";
  else if (userAgent.includes("Linux")) os = "Linux";

  return {
    id: crypto.randomUUID(),
    deviceName: `${browser} on ${os}`,
    browser,
    os,
    ip,
    location: ip.startsWith("127.") || ip === "::1" ? "Local Session" : "Active Location",
    lastActive: new Date(),
  };
}

function userToProfile(user: any, meId?: string) {
  return {
    id: user._id.toString(),
    username: user.username,
    fullName: user.fullName,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
    website: user.website ?? null,
    gender: user.gender ?? null,
    pronouns: user.pronouns ?? null,
    dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString() : null,
    interests: user.interests ?? [],
    profileCompleted: user.profileCompleted ?? false,
    role: user.role ?? "user",
    isVerified: user.isVerified ?? false,
    isPrivate: user.isPrivate ?? false,
    twoFactorEnabled: user.twoFactorEnabled ?? false,
    privacySettings: user.privacySettings,
    notificationSettings: user.notificationSettings,
    messageSettings: user.messageSettings,
    contentSettings: user.contentSettings,
    languageSettings: user.languageSettings,
    postsCount: 0,
    followersCount: user.followers?.length ?? 0,
    followingCount: user.following?.length ?? 0,
    isFollowing: false,
    isMe: meId === user._id.toString(),
    createdAt: user.createdAt.toISOString(),
  };
}

async function issueTokenPair(userId: string, username: string) {
  const accessToken = signToken({ userId, username });
  const rawRefresh = generateRefreshToken();
  const tokenHash = hashRefreshToken(rawRefresh);
  await RefreshToken.create({ userId, tokenHash, expiresAt: refreshTokenExpiresAt() });
  return { token: accessToken, refreshToken: rawRefresh };
}

// ── Check Username Availability ───────────────────────────────────────────────
router.get("/auth/check-username", async (req, res): Promise<void> => {
  const username = String(req.query.username || "").trim().toLowerCase();
  if (!username) { res.status(400).json({ error: "Username is required" }); return; }
  
  if (username.length < 3 || username.length > 30) {
    res.json({ available: false, message: "Username must be between 3 and 30 characters" });
    return;
  }
  // English only: Letters, numbers, and underscores (and dots)
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    res.json({ available: false, message: "Username must be in English letters, numbers, and underscores only" });
    return;
  }
  const existing = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, "i") } });
  if (existing) {
    res.json({ available: false, message: "Username is already taken" });
    return;
  }
  res.json({ available: true, message: "Username is available" });
});

// ── Check Email Availability ──────────────────────────────────────────────────
router.get("/auth/check-email", async (req, res): Promise<void> => {
  const email = String(req.query.email || "").trim().toLowerCase();
  if (!email) { res.status(400).json({ error: "Email is required" }); return; }
  
  const existing = await User.findOne({ email });
  if (existing) {
    res.json({ available: false, message: "Email is already registered" });
    return;
  }
  res.json({ available: true, message: "Email is available" });
});

// ── Step 1: Register Initiation (Sends 6-digit OTP to Email) ─────────────────
router.post("/auth/register", authLimiter, async (req, res): Promise<void> => {
  const raw = req.body as Record<string, unknown>;
  const username = typeof raw.username === "string" ? raw.username.trim().toLowerCase() : "";
  const email    = typeof raw.email    === "string" ? raw.email.trim().toLowerCase()    : "";
  const password = typeof raw.password === "string" ? raw.password        : "";
  const fullName = typeof raw.fullName === "string" ? raw.fullName.trim() : "";

  if (!username || !email || !password || !fullName) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  // Strict username validation: English letters, numbers, underscore, 3-30 chars
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    res.status(400).json({ error: "Username must be 3-30 characters and contain only English letters, numbers, and underscores" });
    return;
  }

  // Strict email format check
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: "Please provide a valid email address" });
    return;
  }

  // Strong password policy: 10+ chars, upper, lower, number, special char
  if (password.length < 10) {
    res.status(400).json({ error: "Password must be at least 10 characters long" });
    return;
  }
  if (!/[A-Z]/.test(password)) {
    res.status(400).json({ error: "Password must contain at least one uppercase letter (A-Z)" });
    return;
  }
  if (!/[a-z]/.test(password)) {
    res.status(400).json({ error: "Password must contain at least one lowercase letter (a-z)" });
    return;
  }
  if (!/[0-9]/.test(password)) {
    res.status(400).json({ error: "Password must contain at least one number (0-9)" });
    return;
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    res.status(400).json({ error: "Password must contain at least one special character (!@#$%^&*...)" });
    return;
  }

  // Check unique constraints
  const existingUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existingUser) {
    if (existingUser.username === username) {
      res.status(409).json({ error: "Username is already taken" });
    } else {
      res.status(409).json({ error: "Email is already registered" });
    }
    return;
  }

  // Generate 6-digit OTP
  const code = generateOtpCode();
  const codeHash = hashOtpCode(code);
  const passwordHash = await hashPassword(password);

  // Store or update pending verification (expires in 10 minutes)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await OtpVerification.deleteMany({ email, type: "register" });
  const pendingRecord = await OtpVerification.create({
    email,
    code: codeHash,
    type: "register",
    payload: {
      username,
      fullName,
      passwordHash,
    },
    expiresAt,
    attempts: 0,
    lastSentAt: new Date(),
  });

  let clientDispatchRequired = false;
  try {
    await sendOtpEmail({ email, code, type: "register" });
  } catch (err: any) {
    logger.warn({ err: err.message, email }, "SMTP/Resend email sending failed. Falling back to client-side dispatch.");
    clientDispatchRequired = true;
  }

  res.status(200).json({
    pendingVerification: true,
    email,
    expiresAt,
    clientDispatchRequired,
    otpCode: clientDispatchRequired ? code : undefined,
    emailType: "register",
    message: clientDispatchRequired
      ? "Verification code generated successfully. Ready for device-level delivery."
      : "A 6-digit verification code has been sent to your email address.",
  });
});

// Alias for /auth/signup
router.post("/auth/signup", authLimiter, (req, res, next) => {
  (router as any).handle(Object.assign(req, { url: "/auth/register" }), res, next);
});

// ── Step 2: Verify Registration OTP & Activate Account ───────────────────────
router.post("/auth/verify-registration", authLimiter, async (req, res): Promise<void> => {
  const { email, code } = req.body as { email?: string; code?: string };
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanCode = String(code || "").trim();

  if (!cleanEmail || !cleanCode) {
    res.status(400).json({ error: "Email and verification code are required" });
    return;
  }

  const record = await OtpVerification.findOne({
    email: cleanEmail,
    type: "register",
    expiresAt: { $gt: new Date() },
  });

  if (!record) {
    res.status(400).json({ error: "Verification code expired or not found. Please request a new code." });
    return;
  }

  if (record.attempts >= 5) {
    await OtpVerification.deleteOne({ _id: record._id });
    res.status(429).json({ error: "Too many incorrect attempts. This code has been invalidated. Please request a new verification code." });
    return;
  }

  const inputHash = hashOtpCode(cleanCode);
  const isMatch = record.code === inputHash;

  if (!isMatch) {
    record.attempts += 1;
    await record.save();
    const remaining = 5 - record.attempts;
    res.status(400).json({
      error: `Invalid verification code. ${remaining} attempt(s) remaining.`,
    });
    return;
  }

  // Code is valid! Create the real active user account in database
  const { username, fullName, passwordHash } = record.payload || {};
  if (!username || !fullName || !passwordHash) {
    res.status(500).json({ error: "Registration payload corrupted. Please start registration again." });
    return;
  }

  // Ensure username/email didn't get taken while waiting
  const raceCheck = await User.findOne({ $or: [{ username }, { email: cleanEmail }] });
  if (raceCheck) {
    await OtpVerification.deleteOne({ _id: record._id });
    res.status(409).json({ error: "Account already exists with this username or email." });
    return;
  }

  // Capture initial session device info
  const clientInfo = getClientInfo(req);

  const newUser = await User.create({
    username,
    email: cleanEmail,
    fullName,
    passwordHash,
    role: "user",
    profileCompleted: false,
    isVerified: false,
    sessions: [clientInfo],
    loginAlerts: [{
      id: crypto.randomUUID(),
      deviceName: clientInfo.deviceName,
      location: clientInfo.location,
      timestamp: new Date(),
      ip: clientInfo.ip,
      isRead: true,
    }],
  });

  // Clean up the OTP record
  await OtpVerification.deleteOne({ _id: record._id });

  // Issue real JWT session
  const { token, refreshToken } = await issueTokenPair(newUser._id.toString(), newUser.username);
  res.status(201).json({
    token,
    refreshToken,
    user: userToProfile(newUser, newUser._id.toString()),
    message: "Email verified successfully! Welcome to WhiterChat.",
  });
});

// Alias for /auth/verify-email
router.post("/auth/verify-email", authLimiter, (req, res, next) => {
  (router as any).handle(Object.assign(req, { url: "/auth/verify-registration" }), res, next);
});

// ── Resend Registration OTP ──────────────────────────────────────────────────
router.post("/auth/resend-code", authLimiter, async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const existingRecord = await OtpVerification.findOne({
    email: cleanEmail,
    type: "register",
  });

  if (!existingRecord) {
    res.status(404).json({ error: "No pending registration found for this email. Please register again." });
    return;
  }

  // Cooldown check (60 seconds)
  const lastSent = existingRecord.lastSentAt ? new Date(existingRecord.lastSentAt).getTime() : new Date(existingRecord.updatedAt).getTime();
  const timeSinceLastSent = Date.now() - lastSent;
  if (timeSinceLastSent < 60_000) {
    const waitSeconds = Math.ceil((60_000 - timeSinceLastSent) / 1000);
    res.status(429).json({ error: `Please wait ${waitSeconds} seconds before requesting a new code.` });
    return;
  }

  const newCode = generateOtpCode();
  existingRecord.code = hashOtpCode(newCode);
  existingRecord.attempts = 0;
  existingRecord.lastSentAt = new Date();
  existingRecord.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await existingRecord.save();

  let clientDispatchRequired = false;
  try {
    await sendOtpEmail({ email: cleanEmail, code: newCode, type: "register" });
  } catch (err: any) {
    logger.warn({ err: err.message, email: cleanEmail }, "SMTP/Resend email sending failed during resend. Falling back to client-side dispatch.");
    clientDispatchRequired = true;
  }

  res.json({
    ok: true,
    clientDispatchRequired,
    otpCode: clientDispatchRequired ? newCode : undefined,
    emailType: "register",
    message: clientDispatchRequired
      ? "New verification code generated successfully. Ready for device-level delivery."
      : "A new 6-digit verification code has been sent to your email address.",
  });
});

// Alias for /auth/resend-verification
router.post("/auth/resend-verification", authLimiter, (req, res, next) => {
  (router as any).handle(Object.assign(req, { url: "/auth/resend-code" }), res, next);
});

// ── Password Reset: Step 1 - Request Reset Code ──────────────────────────────
router.post("/auth/forgot-password", authLimiter, async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail) {
    res.status(400).json({ error: "Email address is required" });
    return;
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    res.status(400).json({ error: "Please enter a valid email address" });
    return;
  }

  const user = await User.findOne({ email: cleanEmail });

  // Account enumeration protection: Generic response whether account exists or not
  if (!user) {
    // Artificial small delay to prevent timing discrepancy
    await new Promise((r) => setTimeout(r, 400));
    res.status(200).json({
      ok: true,
      message: "If an account exists for this email address, a 6-digit verification code has been sent.",
    });
    return;
  }

  // Check resend cooldown on existing password reset OTP
  const existingOtp = await OtpVerification.findOne({ email: cleanEmail, type: "password_reset" });
  if (existingOtp) {
    const lastSent = existingOtp.lastSentAt ? new Date(existingOtp.lastSentAt).getTime() : new Date(existingOtp.updatedAt).getTime();
    const timeSinceLastSent = Date.now() - lastSent;
    if (timeSinceLastSent < 60_000) {
      const waitSeconds = Math.ceil((60_000 - timeSinceLastSent) / 1000);
      res.status(429).json({
        error: `Please wait ${waitSeconds} seconds before requesting another reset code.`,
      });
      return;
    }
  }

  const resetCode = generateOtpCode();
  const resetCodeHash = hashOtpCode(resetCode);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await OtpVerification.deleteMany({ email: cleanEmail, type: "password_reset" });
  const newOtp = await OtpVerification.create({
    email: cleanEmail,
    code: resetCodeHash,
    type: "password_reset",
    expiresAt,
    attempts: 0,
    lastSentAt: new Date(),
  });

  let clientDispatchRequired = false;
  try {
    await sendOtpEmail({ email: cleanEmail, code: resetCode, type: "password_reset" });
  } catch (err: any) {
    logger.warn({ err: err.message, email: cleanEmail }, "SMTP/Resend email sending failed during forgot password. Falling back to client-side dispatch.");
    clientDispatchRequired = true;
  }

  res.status(200).json({
    ok: true,
    clientDispatchRequired,
    otpCode: clientDispatchRequired ? resetCode : undefined,
    emailType: "password_reset",
    message: clientDispatchRequired
      ? "Password recovery code generated successfully. Ready for device-level delivery."
      : "If an account exists for this email address, a 6-digit verification code has been sent.",
  });
});

// ── Password Reset: Step 2 - Verify Reset Code ───────────────────────────────
router.post("/auth/verify-reset-code", authLimiter, async (req, res): Promise<void> => {
  const { email, code } = req.body as { email?: string; code?: string };
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanCode = String(code || "").trim();

  if (!cleanEmail || !cleanCode) {
    res.status(400).json({ error: "Email and reset code are required" });
    return;
  }

  const record = await OtpVerification.findOne({
    email: cleanEmail,
    type: "password_reset",
    expiresAt: { $gt: new Date() },
  });

  if (!record) {
    res.status(400).json({ error: "Reset code has expired or is invalid. Please request a new code." });
    return;
  }

  if (record.attempts >= 5) {
    await OtpVerification.deleteOne({ _id: record._id });
    res.status(429).json({ error: "Too many incorrect attempts. This code has been invalidated. Please request a new code." });
    return;
  }

  const inputHash = hashOtpCode(cleanCode);
  const isMatch = record.code === inputHash;

  if (!isMatch) {
    record.attempts += 1;
    await record.save();
    const remaining = 5 - record.attempts;
    res.status(400).json({
      error: `Invalid reset code. ${remaining} attempt(s) remaining.`,
    });
    return;
  }

  // Code is verified! Generate a cryptographically secure, single-use reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

  record.payload = { resetTokenHash };
  record.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes to submit new password
  await record.save();

  res.status(200).json({
    ok: true,
    resetToken,
    message: "Reset code verified successfully. You may now create your new password.",
  });
});

// ── Password Reset: Step 3 - Submit New Password ─────────────────────────────
router.post("/auth/reset-password", authLimiter, async (req, res): Promise<void> => {
  const { email, resetToken, newPassword, confirmPassword } = req.body as {
    email?: string;
    resetToken?: string;
    newPassword?: string;
    confirmPassword?: string;
  };

  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanToken = String(resetToken || "").trim();
  const cleanPassword = String(newPassword || "");

  if (!cleanEmail || !cleanToken || !cleanPassword) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  if (confirmPassword !== undefined && cleanPassword !== confirmPassword) {
    res.status(400).json({ error: "Passwords do not match" });
    return;
  }

  // Validate strong password policy (10+ chars, upper, lower, number, special char)
  if (cleanPassword.length < 10) {
    res.status(400).json({ error: "Password must be at least 10 characters long" });
    return;
  }
  if (!/[A-Z]/.test(cleanPassword)) {
    res.status(400).json({ error: "Password must contain at least one uppercase letter (A-Z)" });
    return;
  }
  if (!/[a-z]/.test(cleanPassword)) {
    res.status(400).json({ error: "Password must contain at least one lowercase letter (a-z)" });
    return;
  }
  if (!/[0-9]/.test(cleanPassword)) {
    res.status(400).json({ error: "Password must contain at least one number (0-9)" });
    return;
  }
  if (!/[^A-Za-z0-9]/.test(cleanPassword)) {
    res.status(400).json({ error: "Password must contain at least one special character (!@#$%^&*...)" });
    return;
  }

  const record = await OtpVerification.findOne({
    email: cleanEmail,
    type: "password_reset",
    expiresAt: { $gt: new Date() },
  });

  if (!record || !record.payload?.resetTokenHash) {
    res.status(400).json({ error: "Password reset session has expired or is invalid. Please request a new code." });
    return;
  }

  const tokenHash = crypto.createHash("sha256").update(cleanToken).digest("hex");
  if (record.payload.resetTokenHash !== tokenHash) {
    res.status(400).json({ error: "Invalid reset token. Please restart password recovery." });
    return;
  }

  const user = await User.findOne({ email: cleanEmail });
  if (!user) {
    res.status(404).json({ error: "Account not found." });
    return;
  }

  // Update password and ensure account is marked as verified
  user.passwordHash = await hashPassword(cleanPassword);
  user.isVerified = true;
  // Security best practice: invalidate all active sessions and refresh tokens on password change
  user.sessions = [];
  await user.save();

  await RefreshToken.updateMany({ userId: user._id.toString() }, { revoked: true });

  // Invalidate the reset token
  await OtpVerification.deleteOne({ _id: record._id });

  res.status(200).json({
    ok: true,
    message: "Password reset successful! You can now sign in with your new password.",
  });
});


router.post("/auth/login", authLimiter, async (req, res): Promise<void> => {
  const raw = req.body as { identifier?: unknown; password?: unknown; twoFactorCode?: unknown };
  // Cast to string to prevent NoSQL injection (object operators like {$gt:""})
  const identifier = typeof raw.identifier === "string" ? raw.identifier.trim() : "";
  const password   = typeof raw.password  === "string" ? raw.password          : "";
  const twoFactorCode = typeof raw.twoFactorCode === "string" ? raw.twoFactorCode.trim() : "";
  if (!identifier || !password) { res.status(400).json({ error: "Invalid input" }); return; }

  const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier.toLowerCase() }] }).select("+passwordHash +twoFactorSecret +twoFactorBackupCodes");
  if (!user) {
    await comparePassword(password, "$2b$10$invalidhashpaddingtopreventinenumeration000000000000000");
    res.status(401).json({ error: "Invalid credentials" }); return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) { res.status(401).json({ error: "Invalid credentials" }); return; }

  // Ensure account is verified
  if (user.isVerified === false) {
    res.status(403).json({
      error: "Account email is not verified. Please complete verification before signing in.",
      unverifiedEmail: user.email,
    });
    return;
  }

  // If user is deactivated, reactivate upon successful login
  if (user.isDeactivated) {
    user.isDeactivated = false;
  }

  // 2FA check
  if (user.twoFactorEnabled) {
    if (!twoFactorCode) {
      res.status(200).json({
        requires2FA: true,
        message: "Open Google Authenticator and enter the 6-digit code, or use a backup code.",
      });
      return;
    }

    const clean2FA = twoFactorCode.replace(/\s+/g, "").toUpperCase();
    const clean2FANoHyphen = clean2FA.replace(/-/g, "");

    // Check if it matches a one-time emergency backup code
    const backupIndex = (user.twoFactorBackupCodes || []).findIndex(
      (c) => c.replace(/-/g, "").toUpperCase() === clean2FANoHyphen || c.toUpperCase() === clean2FA
    );

    let isTotpValid = false;
    if (backupIndex >= 0) {
      // Consume the used backup code
      const updatedCodes = [...(user.twoFactorBackupCodes || [])];
      updatedCodes.splice(backupIndex, 1);
      user.twoFactorBackupCodes = updatedCodes;
      await user.save();
    } else if (user.twoFactorSecret) {
      // Validate RFC 6238 TOTP with Google Authenticator
      isTotpValid = verifyTotpToken(clean2FA, user.twoFactorSecret);

      if (!isTotpValid) {
        res.status(400).json({
          error: "Invalid two-factor code. Open Google Authenticator to get your current 6-digit code, or use a backup recovery code.",
        });
        return;
      }
    } else {
      res.status(400).json({ error: "Two-factor authentication configuration missing on account." });
      return;
    }
  }

  // Record session device
  const clientInfo = getClientInfo(req);
  const currentSessions = user.sessions || [];
  // Keep up to 10 latest sessions
  user.sessions = [clientInfo, ...currentSessions.filter(s => s.deviceName !== clientInfo.deviceName)].slice(0, 10);

  await user.save();

  const { token, refreshToken } = await issueTokenPair(user._id.toString(), user.username);
  res.json({ token, refreshToken, user: userToProfile(user, user._id.toString()) });
});


router.post("/auth/refresh", sessionLimiter, async (req, res): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) { res.status(401).json({ error: "Refresh token required" }); return; }

  const tokenHash = hashRefreshToken(refreshToken);
  const entry = await RefreshToken.findOne({ tokenHash, revoked: false, expiresAt: { $gt: new Date() } });
  if (!entry) { res.status(401).json({ error: "Invalid or expired refresh token" }); return; }

  const user = await User.findById(entry.userId).select("_id username");
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  await RefreshToken.updateOne({ _id: entry._id }, { revoked: true });
  const { token, refreshToken: newRefreshToken } = await issueTokenPair(user._id.toString(), user.username);
  res.json({ token, refreshToken: newRefreshToken });
});

router.post("/auth/logout", sessionLimiter, async (req, res): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (refreshToken) {
    const tokenHash = hashRefreshToken(refreshToken);
    await RefreshToken.updateOne({ tokenHash }, { revoked: true });
  }
  res.sendStatus(204);
});

router.post("/auth/change-password", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" });
    return;
  }

  // Strong password policy: 10+ chars, upper, lower, number, special char
  if (newPassword.length < 10) {
    res.status(400).json({ error: "New password must be at least 10 characters long" });
    return;
  }
  if (!/[A-Z]/.test(newPassword)) {
    res.status(400).json({ error: "New password must contain at least one uppercase letter (A-Z)" });
    return;
  }
  if (!/[a-z]/.test(newPassword)) {
    res.status(400).json({ error: "New password must contain at least one lowercase letter (a-z)" });
    return;
  }
  if (!/[0-9]/.test(newPassword)) {
    res.status(400).json({ error: "New password must contain at least one number (0-9)" });
    return;
  }
  if (!/[^A-Za-z0-9]/.test(newPassword)) {
    res.status(400).json({ error: "New password must contain at least one special character (!@#$%^&*...)" });
    return;
  }

  const user = await User.findById(req.userId).select("+passwordHash");
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) { res.status(400).json({ error: "Current password is incorrect" }); return; }

  user.passwordHash = await hashPassword(newPassword);
  user.sessions = req ? [getClientInfo(req)] : [];
  await user.save();
  await RefreshToken.deleteMany({ userId: user._id });

  res.sendStatus(204);
});


export default router;
