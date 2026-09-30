# Security & Bug Tracker

## Vulnerability Metrics Summary

| Severity | Total Found | Total Fixed | Remaining Unresolved |
| :--- | :---: | :---: | :---: |
| **Critical** | 3 | 3 | **0** |
| **High** | 4 | 4 | **0** |
| **Medium** | 3 | 3 | **0** |
| **Low** | 2 | 2 | **0** |

---

## Detailed Vulnerability Log

### [CRITICAL-01] Sensitive Credentials Leaked in Default Projections & JSON Responses
- **Component**: `lib/db/src/models/User.ts`
- **Impact**: Without explicit projections, queries like `User.find()` or `User.findById()` could include `passwordHash`, `vaultPin`, and `twoFactorSecret` in output objects.
- **Remediation**: Set `select: false` on `passwordHash`, `vaultPin`, `twoFactorSecret`, and `twoFactorBackupCodes`. Injected a schema-level `transform` in `toJSON` to delete these properties if present.
- **Status**: **RESOLVED**

### [CRITICAL-02] Hardcoded Email Privilege Bypass in Authentication & User Endpoints
- **Component**: `artifacts/api-server/src/routes/users.ts`, `admin.ts`, `index.ts`
- **Impact**: Hardcoded string checks granted automatic superadmin and verified status to a specific email address regardless of database state.
- **Remediation**: Replaced all hardcoded string comparisons with standard database RBAC checks (`user.role`) and clean server environment variable bootstrapping (`INITIAL_ADMIN_EMAIL`).
- **Status**: **RESOLVED**

### [CRITICAL-03] Story Viewers Information Disclosure (IDOR/BOLA)
- **Component**: `artifacts/api-server/src/routes/stories.ts` (`/stories/:storyId/viewers`)
- **Impact**: Any authenticated user could query the complete list of users who viewed any private or public story by simply providing the `storyId`.
- **Remediation**: Added an explicit author validation check (`if (story.authorId.toString() !== req.userId) return 403`).
- **Status**: **RESOLVED**

---

### [HIGH-01] TypeErrors and Crash Risk in Group Conversation Block/Timeout Routes
- **Component**: `artifacts/api-server/src/routes/messages.ts`
- **Impact**: Invoking `/conversations/:conversationId/block`, `/unblock`, or `/timeout` on group conversations attempted to call `.toString()` on `undefined` `user1Id`, resulting in unhandled 500 errors.
- **Remediation**: Added explicit group checks returning standard 400 bad request responses and safe null-coalescing operations.
- **Status**: **RESOLVED**

### [HIGH-02] Missing Selection of Hidden Fields on Security-Critical Verification Operations
- **Component**: `artifacts/api-server/src/routes/vault.ts`, `settings.ts`
- **Impact**: After enabling `select: false` on sensitive fields, endpoints verifying vault PINs or password confirmations were comparing against `undefined`, causing legitimate operations to fail.
- **Remediation**: Explicitly added `.select("+vaultPin")` and `.select("+passwordHash")` on all verification queries.
- **Status**: **RESOLVED**

### [HIGH-03] Unauthenticated Socket.io Event Emission
- **Component**: `server.ts`
- **Impact**: Sockets without authentication could broadcast typing and presence notifications to active conversation rooms.
- **Remediation**: Added guard conditions (`if (!userId) return;`) across all interactive Socket.io listeners (`typing`, `stop_typing`, `mark_read`, `get_presence`, `call_*`).
- **Status**: **RESOLVED**

### [HIGH-04] WebRTC Caller Identity Impersonation
- **Component**: `server.ts` (`call_user` event)
- **Impact**: Socket payload caller could be falsified by a rogue client.
- **Remediation**: Overwrote the caller payload ID with the verified socket session `userId`.
- **Status**: **RESOLVED**

---

### [MEDIUM-01] Missing Algorithm Restriction on JWT Verification
- **Component**: `artifacts/api-server/src/lib/auth.ts`
- **Impact**: Permitted potential algorithm confusion attacks if headers specified unexpected algorithms.
- **Remediation**: Enforced `{ algorithms: ["HS256"] }` in `jwt.verify`.
- **Status**: **RESOLVED**

### [MEDIUM-02] Lack of Throttling on Vault PIN Attempts
- **Component**: `artifacts/api-server/src/routes/vault.ts`
- **Impact**: Brute-force guessing of 4-6 digit numeric PINs on locked vaults.
- **Remediation**: Applied `vaultLimiter` restricting attempts to 5 per 15 minutes per IP.
- **Status**: **RESOLVED**

### [MEDIUM-03] OTP Generation Uniformity & Storage Exposure
- **Component**: `artifacts/api-server/src/lib/email.ts`
- **Impact**: Plaintext OTP codes stored in database records.
- **Remediation**: Switched to `crypto.randomInt(100000, 1000000)` and stored SHA-256 hashes of OTP tokens.
- **Status**: **RESOLVED**

---

### [LOW-01] Group Message Forwarding Participant Verification
- **Component**: `artifacts/api-server/src/routes/messages.ts` (`/conversations/forward`)
- **Impact**: Group message forwarding failed when recipient was a group rather than a 1-on-1 chat.
- **Remediation**: Added group membership lookup and adjusted push notification recipient filtering.
- **Status**: **RESOLVED**

### [LOW-02] Verification Badges Given Automatically on Account Creation
- **Component**: `artifacts/api-server/src/routes/users.ts`
- **Impact**: Inconsistent badge attribution logic.
- **Remediation**: Enforced `isVerified: false` default across all registration pathways until reviewed by an administrator.
- **Status**: **RESOLVED**

---

## Production Verification Status

| Subsystem | Verified Status | Notes |
| :--- | :---: | :--- |
| **Real SMTP** | **VERIFIED** | Live TLS connection to `smtp.gmail.com:465` authenticated successfully. OTP generation, hashing, and secret redaction verified. |
| **Real STUN/TURN** | **UNVERIFIED (UDP Sandbox Egress) / VERIFIED (Signaling & Auth)** | WebRTC peer authentication, SDP negotiation, and ICE candidate exchange verified. Live raw UDP ping to port 19302 is restricted by container network sandbox. |
