"use client";

import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      render: (
        container: HTMLElement | string,
        parameters: {
          sitekey: string;
          theme?: "dark" | "light";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => number;
      reset: (opt_widget_id?: number) => void;
      getResponse: (opt_widget_id?: number) => string;
    };
    __recaptchaReset?: () => void;
  }
}

interface RecaptchaWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

export default function RecaptchaWidget({
  onVerify,
  onExpire,
  onError,
}: RecaptchaWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // Load the reCAPTCHA script
  useEffect(() => {
    if (!siteKey || typeof window === "undefined") return;

    const scriptId = "recaptcha-script";
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      if (window.grecaptcha) {
        setIsLoaded(true);
      } else {
        existingScript.addEventListener("load", () => setIsLoaded(true));
        existingScript.addEventListener("error", () => {
          setError(true);
          onError?.();
        });
      }
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsLoaded(true);
    };
    script.onerror = () => {
      console.error(
        "[reCAPTCHA] Failed to load script from Google. Check internet connection or ad-blockers.",
      );
      setError(true);
      onError?.();
    };
    document.head.appendChild(script);
  }, [siteKey, onError]);

  const renderWidget = useCallback(() => {
    if (!siteKey || !isLoaded || !containerRef.current || !window.grecaptcha) {
      return;
    }

    window.grecaptcha.ready(() => {
      if (!containerRef.current || !window.grecaptcha) return;

      if (widgetIdRef.current !== null) {
        try {
          window.grecaptcha.reset(widgetIdRef.current);
        } catch {
          // Ignore reset error
        }
        return;
      }

      if (containerRef.current.children.length > 0) {
        return;
      }

      try {
        widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
          theme: "dark",
          callback: (token: string) => {
            setError(false);
            onVerify(token);
          },
          "expired-callback": () => {
            onExpire?.();
          },
          "error-callback": () => {
            console.error(
              "[reCAPTCHA] Google error: Check if domain (localhost) is authorized and key is v2 Checkbox.",
            );
            setError(true);
            onError?.();
          },
        });
      } catch (err) {
        console.error("[reCAPTCHA] Failed to render widget:", err);
        setError(true);
        onError?.();
      }
    });
  }, [siteKey, isLoaded, onVerify, onExpire, onError]);

  // Render widget when loaded
  useEffect(() => {
    if (isLoaded) {
      renderWidget();
    }
  }, [isLoaded, renderWidget]);

  // Expose reset function globally for error handling
  const reset = useCallback(() => {
    if (widgetIdRef.current !== null && window.grecaptcha) {
      try {
        window.grecaptcha.reset(widgetIdRef.current);
      } catch {
        // Ignore reset error
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__recaptchaReset = reset;
    }
    return () => {
      if (typeof window !== "undefined") {
        delete window.__recaptchaReset;
      }
    };
  }, [reset]);

  if (!siteKey) {
    if (process.env.NODE_ENV === "development") {
      return (
        <div
          style={{
            padding: "12px",
            border: "1px dashed var(--border)",
            borderRadius: "4px",
            background: "rgba(255, 184, 0, 0.1)",
            color: "var(--neon-amber)",
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
            marginBottom: "16px",
          }}
        >
          <strong>reCAPTCHA (Dev Mode)</strong> — Site key not configured.
          Verification is skipped in development.
        </div>
      );
    }
    return null;
  }

  if (error) {
    return (
      <div
        style={{
          padding: "12px",
          border: "1px solid var(--danger)",
          borderRadius: "4px",
          background: "rgba(255, 0, 0, 0.1)",
          color: "var(--danger)",
          fontSize: "12px",
          fontFamily: "var(--font-mono)",
          marginBottom: "16px",
        }}
      >
        <p style={{ margin: "0 0 6px 0" }}>
          Failed to load reCAPTCHA. Please refresh the page.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ marginBottom: "16px", minHeight: "78px" }}
      data-testid="recaptcha-widget"
    />
  );
}

export type RecaptchaWidgetRef = {
  reset: () => void;
};
