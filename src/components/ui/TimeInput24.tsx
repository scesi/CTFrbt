"use client";

import { useState, useRef, useEffect } from "react";

interface TimeInput24Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  ariaLabel: string;
}

function getPeriod(hours: string): "AM" | "PM" | "--" {
  if (!/^\d{2}$/.test(hours)) return "--";

  const value = Number(hours);
  if (value < 0 || value > 23) return "--";

  return value < 12 ? "AM" : "PM";
}

function sanitizeHoursInput(raw: string): string | null {
  const digits = raw.replace(/\D/g, "").slice(0, 2);

  if (digits.length === 2 && Number(digits) > 23) {
    return null;
  }

  return digits;
}

function sanitizeMinutesInput(raw: string): string | null {
  const digits = raw.replace(/\D/g, "").slice(0, 2);

  if (digits.length === 2 && Number(digits) > 59) {
    return null;
  }

  return digits;
}

const segmentBase: React.CSSProperties = {
  minWidth: 0,
  flex: "0 0 24px",
  width: "24px",
  padding: 0,
  background: "transparent",
  border: "none",
  outline: "none",
  color: "var(--fg)",
  fontFamily: "var(--font-mono)",
  fontSize: "13px",
  textAlign: "center",
};

const separatorStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "13px",
  color: "var(--fg)",
  padding: 0,
  flexShrink: 0,
};

const periodStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "13px",
  color: "var(--fg)",
  minWidth: "20px",
  marginLeft: "4px",
  textAlign: "left",
  lineHeight: 1,
  flexShrink: 0,
};

const containerStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "flex-start",
  height: "38px",
  width: "100%",
  minWidth: 0,
  border: "1px solid var(--border)",
  background: "rgba(0, 0, 0, 0.8)",
  borderRadius: "0",
  padding: "0 8px",
  gap: "2px",
};

export default function TimeInput24({
  id,
  value,
  onChange,
  disabled,
  required,
  ariaLabel,
}: TimeInput24Props) {
  const hoursRef = useRef<HTMLInputElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);

  const [internalHours, setInternalHours] = useState("");
  const [internalMinutes, setInternalMinutes] = useState("");

  useEffect(() => {
    const [h = "", m = ""] = value.split(":");
    setInternalHours(h);
    setInternalMinutes(m);
  }, [value]);

  const emit = (hours: string, minutes: string) => {
    const combined = hours || minutes ? `${hours}:${minutes}` : "";
    onChange(combined);
  };

  const onHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = sanitizeHoursInput(e.target.value);

    if (next === null) {
      return;
    }

    setInternalHours(next);
    emit(next, internalMinutes);

    if (next.length === 2) {
      minutesRef.current?.focus();
      minutesRef.current?.select();
    }
  };

  const onMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = sanitizeMinutesInput(e.target.value);

    if (next === null) {
      return;
    }

    setInternalMinutes(next);
    emit(internalHours, next);
  };

  const onHoursKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowRight") {
      minutesRef.current?.focus();
      minutesRef.current?.select();
    }
  };

  const onMinutesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowLeft") {
      hoursRef.current?.focus();
      hoursRef.current?.select();
    }
    if (e.key === "Backspace" && !e.currentTarget.value) {
      hoursRef.current?.focus();
      hoursRef.current?.select();
    }
  };

  const onHoursBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const currentHours = e.currentTarget.value;

    if (currentHours.length !== 1) {
      return;
    }

    const normalized = currentHours.padStart(2, "0");
    const currentMinutes = minutesRef.current?.value ?? internalMinutes;

    setInternalHours(normalized);
    emit(normalized, currentMinutes);
  };

  const onMinutesBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const currentMinutes = e.currentTarget.value;

    if (currentMinutes.length !== 1) {
      return;
    }

    const normalized = currentMinutes.padStart(2, "0");
    const currentHours = hoursRef.current?.value ?? internalHours;

    setInternalMinutes(normalized);
    emit(currentHours, normalized);
  };

  return (
    <div id={id} role="group" style={containerStyle} aria-label={ariaLabel}>
      <input
        ref={hoursRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={internalHours}
        onChange={onHoursChange}
        onBlur={onHoursBlur}
        onKeyDown={onHoursKeyDown}
        onFocus={(e) => e.currentTarget.select()}
        onClick={(e) => e.currentTarget.select()}
        disabled={disabled}
        required={required}
        aria-label={`${ariaLabel}, hours`}
        placeholder="HH"
        maxLength={2}
        style={segmentBase}
      />
      <span style={separatorStyle}>:</span>
      <input
        ref={minutesRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={internalMinutes}
        onChange={onMinutesChange}
        onBlur={onMinutesBlur}
        onKeyDown={onMinutesKeyDown}
        onFocus={(e) => e.currentTarget.select()}
        onClick={(e) => e.currentTarget.select()}
        disabled={disabled}
        required={required}
        aria-label={`${ariaLabel}, minutes`}
        placeholder="MM"
        maxLength={2}
        style={segmentBase}
      />
      <span style={periodStyle}>{getPeriod(internalHours)}</span>
    </div>
  );
}
