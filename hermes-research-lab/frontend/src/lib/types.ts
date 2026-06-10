// System types
export interface SystemOverview {
  hermes_version: string;
  provider: string;
  profiles: ProfileSummary[];
  templates_count: number;
  total_skills: number;
}

export interface ProfileSummary {
  name: string;
  model: string;
  skills_count: number;
}

export interface Profile {
  name: string;
  model: string;
  skills_count: number;
  soul?: string;
  memory?: string;
}

// Template types
export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  params: TemplateParam[];
}

export interface TemplateParam {
  name: string;
  type: "text" | "select" | "toggle" | "number";
  label: string;
  required: boolean;
  default?: string | number | boolean;
  options?: string[];
}

export interface TemplatePreview {
  template_id: string;
  prompt: string;
  params: Record<string, string>;
}

// Job types (from Hermes API)
export interface Job {
  id: string;
  name: string;
  template_id: string;
  status: "active" | "paused" | "error";
  next_run: string;
  last_run: string;
  params: Record<string, string>;
}

export interface JobOutput {
  id: string;
  job_id: string;
  timestamp: string;
  status: "success" | "error";
  output: string;
  duration_ms: number;
}

// Session types
export interface Session {
  id: string;
  job_id: string;
  started_at: string;
  ended_at?: string;
  status: "running" | "completed" | "failed";
}

export interface SessionMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

// System info types
export interface Hook {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
}

export interface McpServer {
  id: string;
  name: string;
  status: "connected" | "disconnected";
}

export interface ActivityEntry {
  timestamp: string;
  event: string;
  details: string;
}

// Dashboard stats
export interface DashboardStats {
  activeAgents: number;
  executionsToday: number;
  successRate: number;
  lastExecution: string;
}
