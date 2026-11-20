"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeSpectatorSettings } from "@/lib/spectator";
import type { TournamentSettings } from "@/types";

interface Particle {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  opacity: number;
}

const PALETTE = [
  "#f59e0b", // Amber
  "#fbbf24", // Light Amber
  "#fef08a", // Soft Yellow
  "#ffffff", // White
  "#38bdf8", // Sky Blue
  "#34d175", // Emerald
  "#f43f5e", // Rose
];

interface AmbientCelebrationProps {
  forceActive?: boolean;
}

export function AmbientCelebration({ forceActive }: AmbientCelebrationProps = {}) {
  const [settings, setSettings] = useState<TournamentSettings | null | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (forceActive) return;
    const unsub = subscribeSpectatorSettings(setSettings);
    return () => unsub();
  }, [forceActive]);

  const isCompleted = forceActive || settings?.auctionStatus === "completed";

  useEffect(() => {
    if (!isCompleted) return;
    if (typeof window === "undefined") return;

    // Respect reduced motion preferences
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = (canvas.width = window.innerWidth * dpr);
    let height = (canvas.height = window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    // Particle pool: 45 lightweight particles
    const particleCount = Math.min(48, Math.floor(window.innerWidth / 26));
    const particles: Particle[] = [];

    const createParticle = (initialY?: number): Particle => {
      const isRibbon = Math.random() > 0.45;
      return {
        x: Math.random() * width,
        y: initialY !== undefined ? initialY * dpr : Math.random() * height,
        w: (isRibbon ? Math.random() * 8 + 6 : Math.random() * 6 + 4) * dpr,
        h: (isRibbon ? Math.random() * 4 + 3 : Math.random() * 6 + 4) * dpr,
        vx: (Math.random() - 0.5) * 1.2 * dpr,
        vy: (Math.random() * 1.3 + 0.7) * dpr,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 3,
        wobble: Math.random() * 10,
        wobbleSpeed: Math.random() * 0.04 + 0.02,
        opacity: Math.random() * 0.35 + 0.45,
      };
    };

    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle());
    }

    let animationFrameId: number;
    let isRunning = true;

    const handleResize = () => {
      if (!canvas) return;
      const newDpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.width = window.innerWidth * newDpr;
      height = canvas.height = window.innerHeight * newDpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    const handleVisibility = () => {
      if (document.hidden) {
        isRunning = false;
        cancelAnimationFrame(animationFrameId);
      } else {
        if (!isRunning) {
          isRunning = true;
          animationFrameId = requestAnimationFrame(render);
        }
      }
    };

    window.addEventListener("resize", handleResize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);

    const render = () => {
      if (!isRunning) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.wobble += p.wobbleSpeed;
        p.x += p.vx + Math.sin(p.wobble) * 0.75;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Wrap around horizontally if blown offscreen
        if (p.x < -20) p.x = width + 20;
        else if (p.x > width + 20) p.x = -20;

        // Loop continuously from top when falling past bottom
        if (p.y > height + 20) {
          particles[i] = createParticle(-20);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isCompleted]);

  if (!isCompleted) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 size-full"
    />
  );
}
