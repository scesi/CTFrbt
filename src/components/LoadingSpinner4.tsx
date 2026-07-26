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

export default function LoadingSpinner4() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Generate terminal-style particles close to the logo
    const newParticles: Particle[] = [];
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      const radius = 30 + Math.random() * 15;
      newParticles.push({
        id: i,
        x: 50 + Math.cos(angle) * radius / 2,
        y: 50 + Math.sin(angle) * radius / 2,
        char: TERMINAL_CHARS[Math.floor(Math.random() * TERMINAL_CHARS.length)],
        speedX: (Math.random() - 0.5) * 2,
        speedY: (Math.random() - 0.5) * 2,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }
    setParticles(newParticles);

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
      {/* Terminal-style particles - close to the logo */}
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

      {/* GIF with cropped edges (recorta bordes hacia el centro) */}
      <div style={{
        textAlign: "center",
        opacity: 0.5,
        // Recorta 10% de cada borde hacia el centro
        clipPath: "inset(10% 10% 10% 10%)",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/loading-gif-2.gif"
          alt="Loading"
          style={{
            width: "200px",
            height: "200px",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      </div>
    </div>
  );
}
