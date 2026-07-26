"use client";

import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  char: string;
  speedX: number;
  speedY: number;
  opacity: number;
}

const TERMINAL_CHARS = "█▓▒░■▲▼◆●○◇→←↑↓↖↗↘↙♣♦♥♠♫☼►◄↻↺∴∵§¶†‡•‣⁂⁎⁑⁕";

export default function LoadingSpinner1() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shake, setShake] = useState(0);

  useEffect(() => {
    // Generate terminal-style particles very close to the logo
    const newParticles: Particle[] = [];
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      const radius = 20 + Math.random() * 10;
      newParticles.push({
        id: i,
        x: 50 + (Math.cos(angle) * radius) / 2,
        y: 50 + (Math.sin(angle) * radius) / 2,
        char: TERMINAL_CHARS[Math.floor(Math.random() * TERMINAL_CHARS.length)],
        speedX: (Math.random() - 0.5) * 1.5,
        speedY: (Math.random() - 0.5) * 1.5,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }
    setParticles(newParticles);

    // Rapid shake - Watch Dogs 2 style distortion
    const shakeInterval = setInterval(() => {
      setShake((Math.random() * 12 - 6) * 2);
    }, 40);

    // Particle animation - slow drift
    const particleInterval = setInterval(() => {
      setParticles((prev) =>
        prev.map((p) => ({
          ...p,
          x: p.x + p.speedX * 1,
          y: p.y + p.speedY * 1,
          char: TERMINAL_CHARS[
            Math.floor(Math.random() * TERMINAL_CHARS.length)
          ],
          opacity: Math.random() * 0.5 + 0.2,
        })),
      );
    }, 200);

    return () => {
      clearInterval(shakeInterval);
      clearInterval(particleInterval);
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "240px",
        position: "relative",
        color: "var(--fg-dim)",
        fontSize: "14px",
      }}
    >
      {/* Terminal-style particles - very close to the logo */}
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: "10px",
            fontFamily: "var(--font-mono)",
            color: "#ffffff",
            opacity: p.opacity,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {p.char}
        </div>
      ))}

      {/* Logo with rapid shake - Watch Dogs 2 distortion */}
      <div
        style={{
          transform: `translateX(${shake}px) translateY(${shake * 0.3}px) rotate(${shake * 0.8}deg)`,
          transition: "transform 0.03s ease-out",
          textAlign: "center",
          opacity: 0.8,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/imagen-invertida.png"
          alt="Loading"
          style={{
            width: "184px",
            height: "184px",
            objectFit: "contain",
            filter: "invert(1) hue-rotate(180deg)",
          }}
        />
      </div>
    </div>
  );
}
