import { ParamDef } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface DynamicParamProps {
  param: ParamDef;
  value: any;
  onChange: (value: any) => void;
  required?: boolean;
}

export function DynamicParam({ param, value, onChange, required }: DynamicParamProps) {
  const handleChange = (val: any) => {
    onChange(val);
  };

  return (
    <div className="space-y-2 py-3">
      <div className="flex items-center gap-1">
        <Label htmlFor={param.name} className="text-sm font-medium">
          {param.label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      </div>

      {param.type === "text" && (
        <Textarea
          id={param.name}
          placeholder={param.default || ""}
          value={value || ""}
          onChange={(e) => handleChange(e.target.value)}
          className="resize-none"
        />
      )}

      {param.type === "url" && (
        <Input
          id={param.name}
          type="url"
          placeholder={param.default || ""}
          value={value || ""}
          onChange={(e) => handleChange(e.target.value)}
        />
      )}

      {param.type === "number" && (
        <Input
          id={param.name}
          type="number"
          placeholder={param.default || ""}
          value={value ?? ""}
          onChange={(e) => handleChange(e.target.value === "" ? "" : Number(e.target.value))}
        />
      )}

      {param.type === "select" && (
        <Select
          value={value || ""}
          onValueChange={handleChange}
        >
          <SelectTrigger id={param.name}>
            <SelectValue placeholder={param.default || "Select option"} />
          </SelectTrigger>
          <SelectContent>
            {param.options?.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {param.type === "toggle" && (
        <div className="flex items-center space-x-2 py-2">
          <Switch
            id={param.name}
            checked={!!value}
            onCheckedChange={handleChange}
          />
          <Label htmlFor={param.name} className="text-sm font-normal">
            Enable {param.label}
          </Label>
        </div>
      )}
    </div>
  );
}
