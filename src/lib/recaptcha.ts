/**
 * Google reCAPTCHA v2 Checkbox verification utility.
 *
 * Validates a reCAPTCHA token against Google's verification API.
 * If RECAPTCHA_SECRET_KEY is not configured, validation is skipped
 * (development mode) with a warning logged.
 */

export interface RecaptchaVerificationResult {
  success: boolean;
  errorCodes?: string[];
}

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

export async function verifyRecaptcha(
  token: string,
  remoteIp?: string,
): Promise<{ success: boolean; errorCodes?: string[] }> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  // If secret key is not configured, skip validation (dev mode)
  if (!secretKey) {
    console.warn(
      "[recaptcha] RECAPTCHA_SECRET_KEY not configured — skipping verification (development mode)",
    );
    return { success: true };
  }

  if (!token || token.length === 0) {
    return {
      success: false,
      errorCodes: ["missing-input-response"],
    };
  }

  try {
    const params = new URLSearchParams();
    params.append("secret", secretKey);
    params.append("response", token);
    if (remoteIp) {
      params.append("remoteip", remoteIp);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(
        `[recaptcha] Verification request failed with status: ${response.status}`,
      );
      return {
        success: false,
        errorCodes: ["verification-failed"],
      };
    }

    const data = (await response.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };

    return {
      success: data.success,
      errorCodes: data["error-codes"],
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[recaptcha] Verification request timed out");
      return { success: false, errorCodes: ["timeout"] };
    }
    console.error("[recaptcha] Verification error:", error);
    return { success: false, errorCodes: ["verification-failed"] };
  }
}

/**
 * Extract client IP from request headers.
 * Uses x-forwarded-for (first IP) or x-real-ip headers.
 */
export function getClientIp(headers: Headers): string | undefined {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  return undefined;
}
