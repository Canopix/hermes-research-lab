export interface Agent {
  id: string
  name: string
  status: 'active' | 'paused' | 'error' | 'running'
  template: string
  profile?: string
  nextRun: string | null
  lastRun: string | null
  /** Raw ISO timestamp from Hermes — used to detect new executions while polling */
  lastRunAt?: string | null
  lastStatus?: string | null
  config: Record<string, any>
}

export interface Template {
  id: string
  name: string
  description: string
  icon: string
  category: string
  categoryLabel: string
  params: ParamDef[]
  hermesConfig: { toolsets: string[]; skills: string[] }
}

export interface ParamDef {
  name: string
  label: string
  type: 'text' | 'select' | 'toggle' | 'number' | 'url'
  required?: boolean
  default?: any
  options?: string[]
}

export interface Execution {
  id: string
  agentId: string
  status: string
  startedAt: string
  finishedAt: string | null
  output: string
  duration: number | null
  /** Human-readable report title extracted from markdown */
  title?: string
  excerpt?: string
  jobName?: string
  linkCount?: number
  isSilent?: boolean
  isFailed?: boolean
}

// --- Explore API types ---

export interface SystemOverview {
  profiles_count: number
  jobs_count: number
  skills_count: number
  toolsets_count: number
  hooks_count: number
  health: Record<string, any>
}

export interface ProfileBasic {
  name: string
  description: string
  skills: string[]
}

export interface ProfileDetail {
  name: string
  config: Record<string, any> | null
  soul: string | null
  memory: string | null
  user: string | null
  skills: string[]
}

export interface HookInfo {
  name: string
  path: string
  executable: boolean
  size: number
  modified: number
}

export interface McpServerInfo {
  name: string
  config: Record<string, any>
  profile?: string
}

export interface CronJobInfo {
  name?: string
  profile: string
  [key: string]: any
}

export interface ActivityLog {
  source: string | null
  content: string
  lines: number
  note?: string
}

export interface GlobalConfig {
  content: string
  parsed: Record<string, any>
}

// --- Job creation payload ---

export interface CreateJobPayload {
  name: string
  template: string
  config: Record<string, any>
  prompt: string
  schedule: string
  deliver: string
}

// --- Wizard improvement types ---

export interface ProviderOption {
  id: string
  name: string
  model: string
  base_url: string
  is_default: boolean
}

export interface ProvidersResponse {
  default_provider: string | null
  default_model: string | null
  options: ProviderOption[]
}

export interface DeliveryChannel {
  id: string
  name: string
  icon: string
  description: string
  supports_chat_id?: boolean
  supports_thread_id?: boolean
}

export interface SkillInfo {
  name: string
  description: string
  category: string
}

export interface ToolsetInfo {
  name: string
  description: string
  enabled: boolean
}
