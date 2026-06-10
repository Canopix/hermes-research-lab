"use client";

import { AlertCircle, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AnimateIn } from "./AnimateIn";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  retry?: () => void;
  action?: { label: string; href: string };
}

export function ErrorState({
  title = "Algo salió mal",
  description = "Ha ocurrido un error inesperado.",
  icon: Icon = AlertCircle,
  retry,
  action,
}: ErrorStateProps) {
  return (
    <AnimateIn direction="fade" duration={300}>
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4 rounded-lg border border-destructive/20 bg-destructive/5 p-8">
        <div className="text-destructive">
          <Icon className="h-12 w-12" strokeWidth={1.5} />
        </div>
        <div className="text-center space-y-2 max-w-md">
          <h3 className="text-lg font-semibold text-destructive">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            {retry && (
              <Button onClick={retry} variant="default">
                Reintentar
              </Button>
            )}
            {action && (
              <Button asChild variant="outline">
                <Link href={action.href}>{action.label}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </AnimateIn>
  );
}
