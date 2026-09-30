import crypto from "crypto";
import nodemailer from "nodemailer";

export interface SendOtpParams {
  email: string;
  code: string;
  type: "register" | "password_reset" | "email_change";
}

/**
 * Creates and returns a configured Nodemailer Transporter
 */
function getEmailTransporter() {
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
  const gmailAppPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

  // 1. Gmail SMTP with App Password (Port 465 SSL or 587 STARTTLS)
  if (gmailUser && gmailAppPass) {
    const cleanAppPass = gmailAppPass.replace(/\s+/g, "");
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT || (process.env.SMTP_SECURE === "false" ? 587 : 465));
    const secure = port === 465;

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: gmailUser,
        pass: cleanAppPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  // 2. Generic Custom SMTP Server
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "").replace(/\s+/g, ""),
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  return null;
}

/**
 * Generates an HTML email for verification codes with high-contrast, responsive layout
 */
function buildEmailTemplate(code: string, type: "register" | "password_reset" | "email_change"): { subject: string; html: string; text: string } {
  let subject = "";
  let heading = "";
  let leadText = "";
  let actionDescription = "";

  if (type === "register") {
    subject = `WhiterChat - Your 6-Digit Email Verification Code is ${code}`;
    heading = "Confirm Your Email Address";
    leadText = "Welcome to WhiterChat! You are one step away from activating your account.";
    actionDescription = "Enter the 6-digit verification code below into the confirmation screen to complete your registration:";
  } else if (type === "password_reset") {
    subject = `WhiterChat - Password Reset Code: ${code}`;
    heading = "Reset Your Password";
    leadText = "We received a request to reset your WhiterChat account password.";
    actionDescription = "Enter the 6-digit security code below to verify your identity and choose a new password:";
  } else {
    subject = `WhiterChat - Email Change Verification Code: ${code}`;
    heading = "Confirm New Email Address";
    leadText = "We received a request to update the email address linked to your account.";
    actionDescription = "Enter the 6-digit code below to confirm this change:";
  }

  const text = `WhiterChat - ${heading}

${leadText}

${actionDescription}

----------------------------------------
VERIFICATION CODE: ${code}
----------------------------------------

• This code is valid for 10 minutes.
• This code is single-use only.
• For your security, never share this code with anyone. WhiterChat administrators will never ask for your code.

If you did not request this, no action is needed and your account remains safe.

© ${new Date().getFullYear()} WhiterChat. All rights reserved.`;

  const html = `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #0f172a; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #f1f5f9; padding: 32px 12px; }
    .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05); }
    .header { background: linear-gradient(135deg, #09090b 0%, #18181b 100%); padding: 36px 28px; text-align: center; }
    .brand-title { color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-style: italic; }
    .brand-subtitle { color: #a1a1aa; font-size: 13px; margin: 6px 0 0 0; font-weight: 400; letter-spacing: 0.5px; }
    .content { padding: 36px 32px; }
    .title { font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; line-height: 1.3; }
    .desc { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 18px; }
    .code-box { background: #f8fafc; border: 2px dashed #0284c7; border-radius: 14px; padding: 24px; text-align: center; margin: 28px 0; }
    .code-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; font-weight: 700; margin-bottom: 8px; }
    .code { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #0284c7; margin: 0; padding-left: 10px; }
    .expiry-badge { display: inline-block; background: #e0f2fe; color: #0369a1; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; margin-top: 14px; }
    .security-callout { background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 10px; padding: 14px 16px; margin: 24px 0 16px 0; }
    .security-callout p { margin: 0; font-size: 12px; line-height: 1.6; color: #92400e; }
    .footer { padding: 24px 32px; background: #fafafa; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="brand-title">WhiterChat</h1>
        <p class="brand-subtitle">Security & Account Services</p>
      </div>
      <div class="content">
        <h2 class="title">${heading}</h2>
        <p class="desc">${leadText}</p>
        <p class="desc">${actionDescription}</p>
        
        <div class="code-box">
          <div class="code-label">Verification Code</div>
          <div class="code">${code}</div>
          <div class="expiry-badge">⏱ Expires in 10 minutes</div>
        </div>

        <div class="security-callout">
          <p><strong>Security Notice:</strong> Never share this code with anyone. WhiterChat personnel will never request your verification code or password under any circumstances.</p>
        </div>

        <p class="desc" style="font-size: 13px; color: #64748b; margin-top: 20px;">
          If you did not make this request, you can safely ignore this email. Your account remains protected.
        </p>
      </div>
      <div class="footer">
        This is an automated system email sent by WhiterChat.<br>
        © ${new Date().getFullYear()} WhiterChat. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text };
}

/**
 * Sends a real OTP verification email using production email providers
 */
export async function sendOtpEmail({ email, code, type }: SendOtpParams): Promise<{ success: boolean; provider: string }> {
  const { subject, html, text } = buildEmailTemplate(code, type);

  // 0. Try Mailjet API if MAILJET_API_KEY is configured
  const mailjetKey = process.env.MAILJET_API_KEY;
  const mailjetSecret = process.env.MAILJET_API_SECRET || process.env.MAILJET_SECRET_KEY;
  if (mailjetKey && mailjetSecret) {
    try {
      const auth = Buffer.from(`${mailjetKey}:${mailjetSecret}`).toString("base64");
      
      const senderEmail = process.env.EMAIL_FROM_EMAIL || process.env.GMAIL_USER || process.env.SMTP_USER || "noreply@whiterchat.me";
      const senderName = process.env.EMAIL_FROM_NAME || "WhiterChat Security";

      const res = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          Messages: [
            {
              From: {
                Email: senderEmail,
                Name: senderName,
              },
              To: [
                {
                  Email: email,
                  Name: email.split("@")[0],
                },
              ],
              Subject: subject,
              TextPart: text,
              HTMLPart: html,
            },
          ],
        }),
      });

      if (res.ok) {
        console.log(`[EMAIL-SERVICE] ✅ Sent verification email via Mailjet to ${email}`);
        return { success: true, provider: "mailjet" };
      }

      const err = await res.text();
      console.error(`[EMAIL-SERVICE] ❌ Mailjet error response: ${err}`);
      throw new Error(`Mailjet provider failed: ${err}`);
    } catch (error) {
      console.error(`[EMAIL-SERVICE] ❌ Mailjet exception:`, error);
      throw error;
    }
  }

  // 1. Try Gmail SMTP or configured custom SMTP transporter
  const transporter = getEmailTransporter();
  if (transporter) {
    try {
      const senderEmail = process.env.GMAIL_USER || process.env.SMTP_USER || "noreply@whiterchat.me";
      const from = process.env.EMAIL_FROM || `"WhiterChat Security" <${senderEmail}>`;

      await transporter.sendMail({
        from,
        to: email,
        subject,
        text,
        html,
      });

      console.log(`[EMAIL-SERVICE] ✅ Real verification email dispatched via SMTP to: ${email}`);
      return { success: true, provider: "smtp" };
    } catch (smtpError) {
      console.error(`[EMAIL-SERVICE] ❌ SMTP delivery failed:`, smtpError);
      throw new Error(`Failed to deliver verification email via SMTP: ${smtpError instanceof Error ? smtpError.message : "Unknown error"}`);
    }
  }

  // 2. Try Resend API if RESEND_API_KEY is configured
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "WhiterChat <noreply@whiterchat.me>",
          to: [email],
          subject,
          html,
          text,
        }),
      });
      if (res.ok) {
        console.log(`[EMAIL-SERVICE] ✅ Sent verification email via Resend to ${email}`);
        return { success: true, provider: "resend" };
      }
      const err = await res.text();
      console.error(`[EMAIL-SERVICE] ❌ Resend error response: ${err}`);
      throw new Error(`Resend provider failed: ${err}`);
    } catch (error) {
      console.error(`[EMAIL-SERVICE] ❌ Resend exception:`, error);
      throw error;
    }
  }

  // If no email provider is configured, do NOT fake success! Throw explicit error.
  console.error(`[EMAIL-SERVICE] ❌ No transactional email service configured (GMAIL_USER/GMAIL_APP_PASSWORD, SMTP_*, or RESEND_API_KEY)`);
  throw new Error("No email service configured on server. Please configure GMAIL_USER and GMAIL_APP_PASSWORD.");
}

/**
 * Cryptographically secure 6-digit number generator
 */
export function generateOtpCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hash an OTP code with SHA-256 for secure database storage
 */
export function hashOtpCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}


