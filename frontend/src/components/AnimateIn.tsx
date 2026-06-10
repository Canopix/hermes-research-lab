"use client";

import { cn } from "@/lib/utils";

interface AnimateInProps {
  children: React.ReactNode;
  delay?: number; // ms
  direction?: "up" | "down" | "left" | "right" | "fade";
  duration?: number; // ms
  className?: string;
}

const animationClassMap: Record<string, string> = {
  up: "animate-in-up",
  down: "animate-in-down",
  left: "animate-in-left",
  right: "animate-in-right",
  fade: "animate-in-fade",
};

export function AnimateIn({
  children,
  delay = 0,
  direction = "up",
  duration = 400,
  className,
}: AnimateInProps) {
  const animationClass = animationClassMap[direction] || "animate-in-up";

  return (
    <div
      className={cn(animationClass, className)}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
}
