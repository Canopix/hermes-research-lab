import { Template } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Bot, Search, Activity, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface TemplateCardProps {
  template: Template;
  isSelected?: boolean;
  onClick: (template: Template) => void;
}

function getIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("research") || n.includes("search")) return Search;
  if (n.includes("monitor")) return Activity;
  if (n.includes("summariz") || n.includes("content")) return FileText;
  return Bot;
}

export function TemplateCard({ template, isSelected, onClick }: TemplateCardProps) {
  const Icon = getIcon(template.name);

  return (
    <Card 
      className={cn(
        "relative h-full cursor-pointer transition-all duration-200 hover:shadow-md group",
        isSelected 
          ? "ring-2 ring-primary border-primary shadow-sm shadow-primary/10" 
          : "hover:border-border/80"
      )}
      onClick={() => onClick(template)}
    >
      {isSelected && (
        <div className="absolute top-3 right-3 z-10">
          <CheckCircle2 className="h-5 w-5 text-primary fill-background" />
        </div>
      )}
      <CardHeader>
        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center mb-2 transition-colors",
          isSelected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="text-base font-semibold">{template.name}</CardTitle>
        <CardDescription className="line-clamp-2 min-h-[40px] text-xs leading-relaxed">
          {template.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {template.hermesConfig?.toolsets?.map((tool) => (
            <Badge key={tool} variant="secondary" className="text-[10px] font-medium px-2 py-0.5">
              {tool}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant={isSelected ? "default" : "outline"} className="w-full h-9 text-xs font-semibold">
          {isSelected ? "Seleccionado" : "Seleccionar"}
        </Button>
      </CardFooter>
    </Card>
  );
}
