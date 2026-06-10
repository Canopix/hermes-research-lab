import { Template } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Search, Activity, FileText, Code, BarChart3, Mail, MessageSquare } from "lucide-react";
import Link from "next/link";

interface TemplateCardProps {
  template: Template;
  onSelect?: (template: Template) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  "researcher": <Search className="h-6 w-6" />,
  "monitor": <Activity className="h-6 w-6" />,
  "summarizer": <FileText className="h-6 w-6" />,
  "coder": <Code className="h-6 w-6" />,
  "analyst": <BarChart3 className="h-6 w-6" />,
  "email": <Mail className="h-6 w-6" />,
  "chat": <MessageSquare className="h-6 w-6" />,
  "general": <Bot className="h-6 w-6" />,
};

function getIcon(name: string) {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(iconMap)) {
    if (lower.includes(key)) return icon;
  }
  return <Bot className="h-6 w-6" />;
}

export function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const icon = getIcon(template.name);
  const iconBg = "bg-primary/10 text-primary";

  return (
    <Card className="relative h-full flex flex-col transition-all hover:shadow-md hover:border-primary/50">
      <CardHeader>
        <div className={`w-12 h-12 rounded-lg ${iconBg} flex items-center justify-center mb-2`}>
          {icon}
        </div>
        <CardTitle className="text-lg">{template.name}</CardTitle>
        <CardDescription className="line-clamp-2 min-h-[40px]">
          {template.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex flex-wrap gap-1 mt-2">
          {template.hermesConfig?.toolsets?.map((tool) => (
            <Badge key={tool} variant="secondary" className="text-[10px]">
              {tool}
            </Badge>
          ))}
          {template.params.map((p) => (
            <Badge key={p.name} variant="outline" className="text-[10px]">
              {p.label}
            </Badge>
          ))}
        </div>
      </CardContent>
      <div className="p-4 pt-0">
        {onSelect ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onSelect(template)}
          >
            Seleccionar
          </Button>
        ) : (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/create?template=${template.id}`}>
              Usar este template
            </Link>
          </Button>
        )}
      </div>
    </Card>
  );
}
