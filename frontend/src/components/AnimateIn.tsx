"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface AnimateInProps {
  children: React.ReactNode;
  delay?: number; // ms
  direction?: "up" | "down" | "left" | "right" | "fade";
  duration?: number; // ms
  className?: string;
}

const transforms: Record<string, string> = {
  up: "translateY(12px)",
  down: "translateY(-12px)",
  left: "translateX(12px)",
  right: "translateX(-12px)",
  fade: "none",
};

export function AnimateIn({
  children,
  delay = 0,
  direction = "up",
  duration = 300,
  className,
}: AnimateInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Skip animation for reduced motion preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Use requestAnimationFrame for batched paint
          requestAnimationFrame(() => {
            setTimeout(() => setVisible(true), delay);
          });
          observer.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: "50px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  const initialTransform = transforms[direction] || transforms.up;

  return (
    <div
      ref={ref}
      className={cn("will-change-transform", className)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : initialTransform,
        transition: visible
          ? `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`
          : "none",
        transitionDelay: visible ? "0ms" : undefined,
      }}
    >
      {children}
    </div>
  );
}
