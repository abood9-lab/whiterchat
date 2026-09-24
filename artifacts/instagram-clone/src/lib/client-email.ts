export interface EmailConfig {
  provider: "emailjs" | "web3forms" | "none";
  // EmailJS keys
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsPublicKey?: string;
  // Web3Forms keys
  web3formsKey?: string;
}

// Default environment configurations
export function getSavedEmailConfig(): EmailConfig {
  const local = localStorage.getItem("whiterchat_client_email_config");
  if (local) {
    try {
      return JSON.parse(local);
    } catch {
      // ignore
    }
  }

  // Fallback to VITE env vars
  const emailjsServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || "";
  const emailjsTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "";
  const emailjsPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "";
  const web3formsKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || "";

  if (emailjsServiceId && emailjsTemplateId && emailjsPublicKey) {
    return {
      provider: "emailjs",
      emailjsServiceId,
      emailjsTemplateId,
      emailjsPublicKey,
    };
  }

  if (web3formsKey) {
    return {
      provider: "web3forms",
      web3formsKey,
    };
  }

  return { provider: "none" };
}

export function saveEmailConfig(config: EmailConfig) {
  localStorage.setItem("whiterchat_client_email_config", JSON.stringify(config));
}

/**
 * Dispatches verification emails directly from the user's browser device.
 * Supports EmailJS or Web3Forms with high-reliability client-side connection.
 */
export async function dispatchClientEmail(
  email: string,
  code: string,
  type: "register" | "password_reset"
): Promise<{ success: boolean; provider: string; error?: string }> {
  const config = getSavedEmailConfig();
  const subject = type === "register" 
    ? `WhiterChat - Your Verification Code is ${code}` 
    : `WhiterChat - Reset Your Password: ${code}`;

  const messageText = `
WhiterChat Verification Services

Verification Code: ${code}

This code is valid for 10 minutes.
For your security, never share this code with anyone. WhiterChat administrators will never ask for your code.
  `.trim();

  // 1. EmailJS delivery
  if (config.provider === "emailjs" && config.emailjsServiceId && config.emailjsTemplateId && config.emailjsPublicKey) {
    try {
      const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: config.emailjsServiceId,
          template_id: config.emailjsTemplateId,
          user_id: config.emailjsPublicKey,
          template_params: {
            to_email: email,
            reply_to: "noreply@whiterchat.me",
            otp_code: code,
            subject: subject,
            message: messageText,
            type: type === "register" ? "Registration" : "Password Reset",
          },
        }),
      });

      if (res.ok) {
        console.log(`[CLIENT-EMAIL] Sent via EmailJS to: ${email}`);
        return { success: true, provider: "emailjs" };
      }
      const errText = await res.text();
      return { success: false, provider: "emailjs", error: errText };
    } catch (e: any) {
      return { success: false, provider: "emailjs", error: e.message || "Network exception" };
    }
  }

  // 2. Web3Forms delivery
  if (config.provider === "web3forms" && config.web3formsKey) {
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: config.web3formsKey,
          name: "WhiterChat Security",
          email: "noreply@whiterchat.me",
          subject: subject,
          to_email: email, // If supported/configured in Web3Forms Pro or custom template
          message: `Send verification code to user: ${email}\n\n${messageText}`,
        }),
      });

      if (res.ok) {
        console.log(`[CLIENT-EMAIL] Sent via Web3Forms to: ${email}`);
        return { success: true, provider: "web3forms" };
      }
      const errText = await res.text();
      return { success: false, provider: "web3forms", error: errText };
    } catch (e: any) {
      return { success: false, provider: "web3forms", error: e.message || "Network exception" };
    }
  }

  return { success: false, provider: "none", error: "No client-side email provider is configured." };
}
