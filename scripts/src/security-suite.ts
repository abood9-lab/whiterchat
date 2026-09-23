import { hashPassword, comparePassword, signToken, verifyToken, generateRefreshToken, hashRefreshToken } from "../../artifacts/api-server/src/lib/auth";
import { generateOtpCode, hashOtpCode } from "../../artifacts/api-server/src/lib/email";
import { generateTotpSecret, generateTotpToken, verifyTotpToken, generateBackupCodes } from "../../artifacts/api-server/src/lib/totp";
import { User } from "../../lib/db/src/models/User";
import { ADMIN_ROLES } from "../../artifacts/api-server/src/middlewares/adminAuth";

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, name: string, errMsg?: string) {
  if (condition) {
    results.push({ suite, name, passed: true });
    console.log(`  ✅ [PASS] ${name}`);
  } else {
    results.push({ suite, name, passed: false, error: errMsg || "Assertion failed" });
    console.error(`  ❌ [FAIL] ${name}: ${errMsg || "Assertion failed"}`);
  }
}

async function runTests() {
  console.log("=================================================");
  console.log("  WHITERCHAT SECURITY AUTOMATED TEST SUITE       ");
  console.log("=================================================\n");

  // ── 1. Password Hashing & Cryptographic Verification ─────────────────────────
  console.log("▶ 1. Cryptographic Password Hashing & Comparison");
  try {
    const rawPass = "MyStrongPassword!987#";
    const hash = await hashPassword(rawPass);
    assert(hash !== rawPass, "Auth", "Password must be hashed (not plaintext)");
    assert(hash.startsWith("$2"), "Auth", "Password hash must use bcrypt format ($2a / $2b)");
    
    const valid = await comparePassword(rawPass, hash);
    assert(valid === true, "Auth", "Valid password matches hash");

    const invalid = await comparePassword("WrongPassword123!", hash);
    assert(invalid === false, "Auth", "Invalid password rejected");

    const empty = await comparePassword("", hash);
    assert(empty === false, "Auth", "Empty password rejected");

    // Test bypass prevention (no magic test strings)
    const bypass1 = await comparePassword("1234567890", hash);
    assert(bypass1 === false, "Auth", "Magic sequence '1234567890' rejected");
    const bypass2 = await comparePassword("12345678910", hash);
    assert(bypass2 === false, "Auth", "Magic sequence '12345678910' rejected");
  } catch (err: any) {
    assert(false, "Auth", "Password tests threw an error", err.message);
  }

  // ── 2. JWT Signing, Verification & Algorithm Confusion Protection ───────────
  console.log("\n▶ 2. JWT Signing, Verification & Algorithm Enforcement");
  try {
    const payload = { userId: "user-123", username: "alice_crypto" };
    const token = signToken(payload);
    assert(typeof token === "string" && token.split(".").length === 3, "JWT", "JWT signed in standard 3-part format");

    const verified = verifyToken(token);
    assert(verified.userId === "user-123" && verified.username === "alice_crypto", "JWT", "Token verifies and extracts accurate claims");

    // Tampered token check
    let tamperedFailed = false;
    try {
      const parts = token.split(".");
      const tampered = parts[0] + "." + parts[1] + ".invalidSignatureXYZ";
      verifyToken(tampered);
    } catch {
      tamperedFailed = true;
    }
    assert(tamperedFailed, "JWT", "Tampered signature correctly rejected");
  } catch (err: any) {
    assert(false, "JWT", "JWT tests threw an error", err.message);
  }

  // ── 3. Refresh Tokens & SHA-256 Token Storage ───────────────────────────────
  console.log("\n▶ 3. Refresh Tokens & Cryptographic Hashing");
  try {
    const rawRefresh = generateRefreshToken();
    assert(rawRefresh.length >= 64, "Refresh", "Refresh token has high cryptographic entropy (96 hex chars)");

    const hashed = hashRefreshToken(rawRefresh);
    assert(hashed.length === 64, "Refresh", "Refresh token is hashed with SHA-256");
    assert(hashed !== rawRefresh, "Refresh", "Hashed token differs from raw token");

    const hashedAgain = hashRefreshToken(rawRefresh);
    assert(hashed === hashedAgain, "Refresh", "SHA-256 hash is deterministic for DB lookup");
  } catch (err: any) {
    assert(false, "Refresh", "Refresh token tests threw an error", err.message);
  }

  // ── 4. Two-Factor Authentication (TOTP) & Backup Codes ─────────────────────
  console.log("\n▶ 4. Two-Factor Authentication (TOTP & RFC 6238)");
  try {
    const secret = generateTotpSecret();
    assert(typeof secret === "string" && secret.length >= 16, "2FA", "TOTP secret is valid Base32 string");

    const currentToken = generateTotpToken(secret);
    assert(/^[0-9]{6}$/.test(currentToken), "2FA", "TOTP token is exactly 6 digits");

    const isValid = verifyTotpToken(currentToken, secret);
    assert(isValid === true, "2FA", "Valid TOTP token accepted");

    const isInvalid = verifyTotpToken("000000", secret);
    assert(isInvalid === false || currentToken === "000000", "2FA", "Invalid TOTP token rejected");

    const backupCodes = generateBackupCodes(8);
    assert(backupCodes.length === 8, "2FA", "Generates requested count of backup codes");
    assert(backupCodes.every(c => /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c)), "2FA", "Backup codes match secure format (XXXX-XXXX)");
  } catch (err: any) {
    assert(false, "2FA", "2FA tests threw an error", err.message);
  }

  // ── 5. OTP Generation & Cryptographic Hashing ────────────────────────────────
  console.log("\n▶ 5. OTP Generation & Cryptographic Hashing");
  try {
    const code = generateOtpCode();
    assert(/^[1-9][0-9]{5}$/.test(code), "OTP", "OTP code is exactly 6 numeric digits (100000-999999)");

    const codeHash = hashOtpCode(code);
    assert(codeHash.length === 64, "OTP", "OTP is hashed with SHA-256");

    const match = hashOtpCode(code) === codeHash;
    assert(match === true, "OTP", "OTP hash match matches input");

    const wrongMatch = hashOtpCode("999999") === codeHash;
    assert(code === "999999" ? wrongMatch : !wrongMatch, "OTP", "Wrong OTP does not match hash");
  } catch (err: any) {
    assert(false, "OTP", "OTP tests threw an error", err.message);
  }

  // ── 6. Schema Model Protection (select: false & toJSON transforms) ───────────
  console.log("\n▶ 6. Database Model Schema Security & Serialization");
  try {
    const userDoc = new User({
      username: "secure_tester",
      email: "secure_tester@example.com",
      fullName: "Secure Tester",
      passwordHash: "$2b$10$xyzFakeHashForSchemaTestOnly123456",
      vaultPin: "$2b$10$xyzFakePin1234",
      twoFactorSecret: "JBSWY3DPEHPK3PXP",
      twoFactorBackupCodes: ["ABCD-1234"],
      role: "user",
    });

    const json = userDoc.toJSON();
    assert(json.passwordHash === undefined, "Schema", "toJSON automatically strips passwordHash");
    assert(json.vaultPin === undefined, "Schema", "toJSON automatically strips vaultPin");
    assert(json.twoFactorSecret === undefined, "Schema", "toJSON automatically strips twoFactorSecret");
    assert(json.twoFactorBackupCodes === undefined, "Schema", "toJSON automatically strips twoFactorBackupCodes");
    assert(json.username === "secure_tester", "Schema", "toJSON retains non-sensitive public fields");
  } catch (err: any) {
    assert(false, "Schema", "Schema tests threw an error", err.message);
  }

  // ── 7. Admin Role Definitions & Authorization ───────────────────────────────
  console.log("\n▶ 7. Role-Based Access Control (RBAC) & Admin Privileges");
  try {
    assert(ADMIN_ROLES.includes("superadmin" as any), "RBAC", "superadmin recognized as an administrative role");
    assert(ADMIN_ROLES.includes("admin" as any), "RBAC", "admin recognized as an administrative role");
    assert(ADMIN_ROLES.includes("moderator" as any), "RBAC", "moderator recognized as an administrative role");
    assert(!ADMIN_ROLES.includes("user" as any), "RBAC", "standard 'user' role is not in ADMIN_ROLES");
    assert(!ADMIN_ROLES.includes("creator" as any), "RBAC", "'creator' account type is not in ADMIN_ROLES");
  } catch (err: any) {
    assert(false, "RBAC", "RBAC tests threw an error", err.message);
  }

  // ── Summary Report ──────────────────────────────────────────────────────────
  console.log("\n=================================================");
  console.log("  SECURITY TEST RESULTS SUMMARY                  ");
  console.log("=================================================");
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  console.log(`Total Tests Run: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.error("\n❌ FAILED TESTS:");
    for (const r of results.filter(r => !r.passed)) {
      console.error(`  - [${r.suite}] ${r.name}: ${r.error}`);
    }
    process.exit(1);
  } else {
    console.log("\n🎉 ALL SECURITY AUDIT TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  }
}

runTests().catch(e => {
  console.error("Fatal error running security suite:", e);
  process.exit(1);
});
