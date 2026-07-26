"use client";

import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
}

export default function LoadingSpinner() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shake, setShake] = useState(0);

  useEffect(() => {
    // Generate particles around the logo (within 100px radius)
    const newParticles: Particle[] = [];
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const radius = 60 + Math.random() * 40;
      newParticles.push({
        id: i,
        x: 50 + Math.cos(angle) * radius / 2,
        y: 50 + Math.sin(angle) * radius / 2,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 4,
        speedY: (Math.random() - 0.5) * 4,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }
    setParticles(newParticles);

    // Rapid shake - Watch Dogs 2 style distortion
    const shakeInterval = setInterval(() => {
      setShake((Math.random() * 12 - 6) * 2);
    }, 40);

    // Particle animation - fast
    const particleInterval = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        x: p.x + p.speedX * 3,
        y: p.y + p.speedY * 3,
        opacity: Math.random() * 0.5 + 0.2,
      })));
    }, 100);

    return () => {
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
      {/* Particles - only around the logo */}
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: "var(--accent)",
            borderRadius: "50%",
            opacity: p.opacity,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Logo with rapid shake - Watch Dogs 2 distortion */}
      <div style={{
        transform: `translateX(${shake}px) translateY(${shake * 0.3}px) rotate(${shake * 0.8}deg)`,
        transition: "transform 0.03s ease-out",
        textAlign: "center",
        opacity: 0.7,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/imagen-invertida.png"
          alt="Loading"
          style={{
            width: "200px",
            height: "200px",
            opacity: 0.9,
            filter: "invert(1) hue-rotate(180deg)",
          }}
        />
      </div>
    </div>
  );
}
