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

export default function LoadingSpinner2() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [logoFrame, setLogoFrame] = useState(0);
  const [shake, setShake] = useState(0);

  useEffect(() => {
    // Generate terminal-style particles very close to the logo
    const newParticles: Particle[] = [];
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      const radius = 20 + Math.random() * 10;
      newParticles.push({
        id: i,
        x: 50 + Math.cos(angle) * radius / 2,
        y: 50 + Math.sin(angle) * radius / 2,
        char: TERMINAL_CHARS[Math.floor(Math.random() * TERMINAL_CHARS.length)],
        speedX: (Math.random() - 0.5) * 1.5,
        speedY: (Math.random() - 0.5) * 1.5,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }
    setParticles(newParticles);

    // Alternate logo frames (open/close mouth) - rapid
    const frameInterval = setInterval(() => {
      setLogoFrame(f => 1 - f);
    }, 150);

    // Subtle shake - light distortion
    const shakeInterval = setInterval(() => {
      setShake((Math.random() * 4 - 2) * 1.5);
    }, 60);

    // Particle animation - slow drift
    const particleInterval = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        x: p.x + p.speedX * 1,
        y: p.y + p.speedY * 1,
        char: TERMINAL_CHARS[Math.floor(Math.random() * TERMINAL_CHARS.length)],
        opacity: Math.random() * 0.5 + 0.2,
      })));
    }, 200);

    return () => {
      clearInterval(frameInterval);
      clearInterval(shakeInterval);
      clearInterval(particleInterval);
    };
  }, []);

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "240px",
      position: "relative",
      color: "var(--fg-dim)",
      fontSize: "14px",
    }}>
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

      {/* Logo with frame alternation (open/close mouth) + subtle shake */}
      <div style={{
        textAlign: "center",
        transform: `translateX(${shake}px) translateY(${shake * 0.3}px) rotate(${shake * 0.5}deg)`,
        transition: "transform 0.04s ease-out",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoFrame === 0 ? "/image1.png" : "/image.png"}
          alt="Loading"
          style={{
            width: "206px",
            height: "206px",
            objectFit: "contain",
            filter: "invert(1)",
          }}
        />
      </div>
    </div>
  );
}
