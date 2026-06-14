---
name: Competitive Repository Scout
description: Scout AI agent repositories for notable activity and intelligence
category: agenthub-template
params:
  - name: repos
    description: Repos to monitor (comma-separated)
    type: text
    required: true
    default: ""
  - name: language
    description: Output language
    type: select
    required: true
    options:
      - español
      - english
    default: español
tags:
  - github
  - scouting
  - competitors
  - intelligence
default_skills:
  - github
  - ai-agent-tools
  - cron-jobs
---

Scout AI agent repositories for notable activity. For each repo in {repos}, run:

1) `gh pr list --repo <repo> --state all --json number,title,author,createdAt,mergedAt --limit 15`
2) `gh issue list --repo <repo> --state open --json number,title,labels,createdAt --limit 10`

**Focus on:**
- New features
- Architectural changes
- Integration patterns
- Security fixes

**Skip:**
- Routine dependency bumps
- Trivial changesets

If nothing notable found, say so briefly.

Organize report by repository with concise analysis of each.

Repos to scout: {repos}
Output language: {language}
