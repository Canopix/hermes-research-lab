# Skills ↔ Templates Mapping

## All Available Skills (25)

| # | Skill | Description |
|---|-------|-------------|
| 1 | `dogfood` | Exploratory QA of web apps: find bugs, evidence, reports |
| 2 | `cron-jobs` | Manage Hermes Agent cron jobs (create, update, delete, run, monitor). Covers schedule formats, delivery channels, toolsets, and pitfalls |
| 3 | `hermes-system` | Hermes Agent system administration: migration, installation, systemd services, gateway management, troubleshooting, and configuration |
| 4 | `simplify-code` | Parallel 3-agent cleanup of recent code changes |
| 5 | `teams-meeting-pipeline` | Operate the Teams meeting summary pipeline via Hermes CLI — summarize meetings, inspect pipeline status, replay jobs, manage Microsoft Graph subscriptions |
| 6 | `agenthub-templates` | Pre-built agent templates for monitoring, automation, and content generation — AI research tracking, competitor analysis, paper summarization, and repository monitoring |
| 7 | `mlops` | Knowledge and Tools for Machine Learning Operations — training, fine-tuning, inference, evaluation, model management, and research tooling for the full ML lifecycle |
| 8 | `creative` | Umbrella skill for the entire creative cluster: ASCII art, video production, comics, infographics, HTML design, AI image/video/audio generation, p5.js, SVG diagrams, and more |
| 9 | `github` | Complete GitHub workflow: auth, repo management, PR lifecycle, code review, issues, and codebase inspection. Covers gh CLI, git + curl REST fallbacks, CI/CD, and project auditing |
| 10 | `hermes-mcp-project` | Build Hermes Agent projects with MCP servers: repo structure, install scripts, profile templates, and member onboarding |
| 11 | `utility-bill-analysis` | Analyze, compare, and model utility bills (electricity, gas, water) to estimate savings from changes in consumption, tariff, or location |
| 12 | `data-app-builder` | Build complete data-driven web applications from scratch — research, data architecture, full frontend implementation with static JSON datasets |
| 13 | `yuanbao` | Yuanbao (元宝) groups: @mention users, query info/members |
| 14 | `xurl` | X/Twitter via xurl CLI: post, search, DM, media, v2 API |
| 15 | `openhue` | Control Philips Hue lights, scenes, rooms via OpenHue CLI |
| 16 | `godmode` | Jailbreak LLMs: Parseltongue, GODMODE, ULTRAPLINIAN |
| 17 | `himalaya` | Himalaya CLI: IMAP/SMTP email from terminal |
| 18 | `macos-computer-use` | Drive the macOS desktop in the background — screenshots, mouse, keyboard, scroll, drag |
| 19 | `serve-debug` | Debug and fix npx serve deployments — stale processes, wrong directories, 404 on assets |
| 20 | `docker-self-hosted` | Deploy self-hosted Docker services on resource-constrained servers. Covers resource assessment, compose setup, nginx proxy, and troubleshooting |
| 21 | `team-roster` | Mission-control orchestration playbook for an interactive Hermes profile. Tells you who's on the team and how to delegate work via kanban |
| 22 | `llm-observability` | Compare, set up, and self-host LLM observability/monitoring tools for tracing, evaluation, and agent visualization |
| 23 | `ai-agent-tools` | Compare, evaluate, and contrast autonomous AI agent frameworks and tools (Hermes, OpenClaw, Claude Code, Codex, etc.) |
| 24 | `multi-agent-architecture` | Design and implement multi-agent architectures for project development, with clear role separation, shared workspaces, and defined responsibilities |
| 25 | `native-mcp` | MCP client: connect servers, register tools (stdio/HTTP) |

---

## All AgentHub Templates (12)

| # | Template | Description | Category |
|---|----------|-------------|----------|
| 1 | Paper Summarizer | Summarize academic papers from arXiv and other sources | Research & Intelligence |
| 2 | Repo Monitor | Monitor GitHub repositories for PRs, issues, and activity | DevOps & Monitoring |
| 3 | Competitive Repository Scout | Scout AI agent repositories for notable activity and intelligence | Research & Intelligence |
| 4 | Security Audit Pipeline | Run comprehensive security audit with dependency scanning and code review | Multi-Skill Workflows |
| 5 | Dependency Security Audit | Daily scan for known vulnerabilities in project dependencies | Development Workflow |
| 6 | Uptime Monitor | Check endpoints periodically. Only notify when something is down | DevOps & Monitoring |
| 7 | Docs Drift Detection | Weekly scan of merged PRs to find API changes that need documentation updates | Development Workflow |
| 8 | AI Researcher | Automated daily research on AI trends, papers, and news | Research & Intelligence |
| 9 | Content Pipeline | Research, draft, and prepare content on a schedule | Research & Intelligence |
| 10 | AI News Digest | Generate a weekly AI news digest covering research, open source, and industry | Research & Intelligence |
| 11 | Competitor Watcher | Monitor competitor websites and detect changes | Research & Intelligence |
| 12 | Nightly Backlog Triage | Triage GitHub issues nightly with priority and category classification | Development Workflow |

---

## Template → Skill Relevance Mapping

### Research & Intelligence

#### Paper Summarizer
- **`agenthub-templates`** — Direct match; includes paper-summarizer sub-template
- **`mlops`** — ML research context, understanding papers about fine-tuning/training/inference
- **`cron-jobs`** — Scheduling the summarizer to run on a cadence
- **`github`** — If papers have associated GitHub repos to inspect

#### AI Researcher
- **`agenthub-templates`** — Direct match; includes ai-researcher sub-template
- **`xurl`** — Source: Twitter/X for trending AI news and researcher posts
- **`mlops`** — ML domain knowledge for filtering and contextualizing research
- **`cron-jobs`** — Scheduling daily research runs
- **`himalaya`** — Delivering research digests via email

#### AI News Digest
- **`agenthub-templates`** — Direct match; includes ai-news-digest sub-template
- **`xurl`** — Source: Twitter/X for real-time AI industry news
- **`mlops`** — Domain knowledge for AI/ML news curation
- **`himalaya`** — Delivering the digest via email
- **`cron-jobs`** — Scheduling weekly/daily digest generation

#### Content Pipeline
- **`agenthub-templates`** — Direct match; includes content-pipeline sub-template
- **`creative`** — Content creation, writing, formatting, design artifacts
- **`xurl`** — Publishing/sourcing content from Twitter/X
- **`himalaya`** — Email delivery of drafts
- **`cron-jobs`** — Scheduling regular content research runs

#### Competitive Repository Scout
- **`agenthub-templates`** — Direct match; includes repo-scout sub-template
- **`github`** — Complete GitHub workflow for PR/issue inspection
- **`ai-agent-tools`** — Context for evaluating AI agent repos and their capabilities
- **`cron-jobs`** — Scheduling periodic scouting runs

#### Competitor Watcher
- **`agenthub-templates`** — Direct match; includes competitor-watcher sub-template
- **`dogfood`** — Web app testing, browser navigation, snapshot capabilities for change detection
- **`cron-jobs`** — Scheduling periodic website checks

### Development Workflow

#### Dependency Security Audit
- **`agenthub-templates`** — Direct match; includes dep-audit sub-template
- **`github`** — Repo access, understanding project structure
- **`serve-debug`** — Debugging deployment issues after security fixes
- **`docker-self-hosted`** — Docker container security considerations

#### Docs Drift Detection
- **`agenthub-templates`** — Direct match; includes docs-drift sub-template
- **`github`** — PR lifecycle, merged PR inspection, file change analysis
- **`cron-jobs`** — Scheduling weekly drift scans

#### Nightly Backlog Triage
- **`agenthub-templates`** — Direct match; includes backlog-triage sub-template
- **`github`** — Issue management, labeling, priority assignment
- **`team-roster`** — Delegating triaged issues to team members via kanban
- **`cron-jobs`** — Scheduling nightly triage runs
- **`multi-agent-architecture`** — Orchestrating issue triage across multiple agents

### DevOps & Monitoring

#### Repo Monitor
- **`agenthub-templates`** — Direct match; includes repo-monitor sub-template
- **`github`** — Complete GitHub workflow for PR/issue/release monitoring
- **`cron-jobs`** — Scheduling periodic repo checks
- **`serve-debug`** — Debugging deployment issues flagged by monitoring

#### Uptime Monitor
- **`agenthub-templates`** — Direct match; includes uptime-monitor sub-template
- **`serve-debug`** — Debugging and fixing unhealthy services
- **`docker-self-hosted`** — Monitoring self-hosted Docker services
- **`llm-observability`** — Complementary monitoring/observability patterns
- **`cron-jobs`** — Scheduling periodic endpoint health checks

### Multi-Skill Workflows

#### Security Audit Pipeline
- **`agenthub-templates`** — Direct match; includes security-audit sub-template
- **`github`** — Code review, codebase inspection, CI/CD analysis
- **`simplify-code`** — Code quality review patterns (parallel reviewer approach)
- **`dogfood`** — Web app security testing via browser interaction
- **`serve-debug`** — Identifying deployment-related security issues

---

## Cross-Cutting Skills

These skills are broadly relevant across many templates:

| Skill | Relevant Templates | Why |
|-------|-------------------|-----|
| **`cron-jobs`** | All 12 templates | Every AgentHub template runs on a schedule; cron-job management is essential for setup, debugging, and monitoring |
| **`github`** | 8 templates | Most templates interact with GitHub repos, PRs, or issues |
| **`agenthub-templates`** | All 12 templates | The umbrella skill that documents the common template pattern and parameter system |
| **`xurl`** | 3 templates | AI Researcher, AI News Digest, Content Pipeline — all use Twitter/X as a data source |
| **`himalaya`** | 3 templates | AI Researcher, AI News Digest, Content Pipeline — email delivery of reports |
| **`mlops`** | 3 templates | Paper Summarizer, AI Researcher, AI News Digest — ML/AI domain knowledge |
| **`docker-self-hosted`** | 2 templates | Uptime Monitor, Dependency Security Audit — self-hosted service concerns |
| **`serve-debug`** | 3 templates | Repo Monitor, Uptime Monitor, Security Audit — debugging deployment issues |
| **`team-roster`** | 1 template | Backlog Triage — delegating triaged issues to team members |

## Skills With No Template Relevance

These skills serve specialized use cases not currently covered by AgentHub templates:

- **`hermes-system`** — System admin (migration, systemd, gateway)
- **`teams-meeting-pipeline`** — Microsoft Teams meeting summaries
- **`hermes-mcp-project`** — MCP server project scaffolding
- **`utility-bill-analysis`** — Utility bill comparison/modeling
- **`data-app-builder`** — Full data-driven web app development
- **`yuanbao`** — Yuanbao group chat interactions
- **`openhue`** — Philips Hue smart home control
- **`godmode`** — LLM jailbreaking/red teaming
- **`macos-computer-use`** — macOS desktop automation
- **`native-mcp`** — MCP server connection and tool registration
- **`multi-agent-architecture`** — Multi-agent system design (partially relevant to Backlog Triage)
