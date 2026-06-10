export interface Agent {
  id: string
  name: string
  status: 'active' | 'paused' | 'error'
  template: string
  nextRun: string | null
  lastRun: string | null
  config: Record<string, any>
}

export interface Template {
  id: string
  name: string
  description: string
  icon: string
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
