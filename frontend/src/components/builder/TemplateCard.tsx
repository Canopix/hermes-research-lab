import { Template } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LucideIcon, CheckCircle2 } from "lucide-react";

interface TemplateCardProps {
  template: Template;
  isSelected?: boolean;
  onClick: (template: Template) => void;
}

export function TemplateCard({ template, isSelected, onClick }: TemplateCardProps) {
  // Mapping simple type names to Lucide icons (mock/placeholder logic)
  const getIcon = (name: string) => {
    if (name.includes("researcher")) return "Search";
    if (name.includes("monitor")) return "Activity";
    if (name.includes("summarizer")) return "FileText";
    return "Bot";
  };

  // Note: In a real app, we'd probably store icon names or use a proper component mapper.
  // For now, we'll use a generic icon or use a more robust way to handle icons.
  // Since I can't easily import dynamic icons, I'll use a simple Lucide icon as a placeholder.
  
  return (
    <Card 
      className={`relative h-full cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary border-primary' : ''}`}
      onClick={() => onClick(template)}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 z-10">
          <CheckCircle2 className="h-6 w-6 text-primary fill-background" />
        </div>
      )}
      <CardHeader>
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
          <span className="text-2xl">🤖</span> {/* Placeholder for icon */}
        </div>
        <CardTitle className="text-lg">{template.name}</CardTitle>
        <CardDescription className="line-clamp-2 min-h-[40px]">
          {template.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1 mt-2">
          {template.hermesConfig?.toolsets?.map((tool) => (
            <Badge key={tool} variant="secondary" className="text-[10px]">
              {tool}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant={isSelected ? "default" : "outline"} className="w-full">
          {isSelected ? "Selected" : "Select Template"}
        </Button>
      </CardFooter>
    </Card>
  );
}
