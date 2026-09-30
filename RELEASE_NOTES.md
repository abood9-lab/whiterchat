# WhiterChat Web Release Notes

**Version**: `web-stable-v1.0.0`  
**Date**: 2026-09-23  
**Status**: Stable Web Release & Baseline Restore Point

---

## Executive Summary
This release marks the certified, audited, and stable web edition of **WhiterChat**. It establishes the baseline reference point before subsequent client platform development. All security hardening, database projection protections, role hierarchy enforcement, and authentication mechanisms are verified.

---

## Quality & Security Verification Matrix

| Subsystem / Metric | Result | Notes |
| :--- | :---: | :--- |
| **Lint / Typecheck** | **PASS** | `npm run lint` completed with 0 errors. |
| **Production Build** | **PASS** | `npm run build` compiled client bundle and server bundle cleanly. |
| **Security Test Suite** | **PASS (34/34)** | `npm run test:security` verified 34/34 cryptographic and RBAC checks. |
| **Subsystem Verification** | **PASS (9/9)** | `npm run test:verify` verified flows and error handlers with 0 failures. |
| **Real SMTP Email** | **VERIFIED** | Live TLS handshake on port 465 with `smtp.gmail.com`, credential auth, OTP hashing, secret redaction. |
| **WebRTC Signaling & Auth** | **VERIFIED** | JWT peer token verification, SDP offer/answer lifecycle, ICE candidate relay attributes. |
| **Live STUN UDP Egress** | **UNVERIFIED (Sandbox)** | Direct outbound UDP port 19302 blocked by cloud sandbox network policy; client browsers handle STUN via local network interface. |

---

## Vulnerability Metrics
- **Critical Issues**: **0** (3 identified and resolved)
- **High Issues**: **0** (4 identified and resolved)
- **Medium Issues**: **0** (3 identified and resolved)
- **Low Issues**: **0** (2 identified and resolved)

---

## Key Features & Hardening in This Release
1. **Cryptographic Authentication**:
   - bcrypt 10 rounds password hashing with strict password complexity policy.
   - JWT tokens signed with HS256, verified with `{ algorithms: ["HS256"] }` to prevent algorithm confusion.
   - High-entropy refresh tokens stored as SHA-256 hashes with session invalidation on credential changes.
   - RFC 6238 TOTP two-factor authentication with 30s window drift tolerance and 8 backup codes.
   - 6-digit uniform CSPRNG OTP generation with SHA-256 hash storage.

2. **Data Isolation & IDOR Protection**:
   - `passwordHash`, `vaultPin`, `twoFactorSecret`, `twoFactorBackupCodes` configured with `select: false` on Mongoose schema.
   - Automatic `toJSON` secret sanitization on serialization.
   - Story viewers query restricted strictly to story author (`story.authorId === req.userId`).
   - Group chat messaging guarded against unauthorized posting, suspension bypass, and type errors.

3. **Complete Web Application Modules**:
   - Direct & Group Messaging (Voice, Media, Disappearing messages, Reactions, Starred, Replies).
   - Posts, Reels, Stories with interactive filters and viewers viewer guards.
   - Audio/Video Calling with WebRTC signaling and high-fidelity sound synthesis.
   - Admin Dashboard with RBAC role management and verification request processing.
   - Vault Media & Message locker with dedicated rate-limiting and PIN protection.
