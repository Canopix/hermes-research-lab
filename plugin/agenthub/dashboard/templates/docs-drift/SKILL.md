---
name: Docs Drift Detection
description: Weekly scan of merged PRs to find API changes that need documentation updates
category: agenthub-template
params:
  - name: repo
    description: GitHub repo (owner/repo)
    type: text
    required: true
    default: ""
tags:
  - docs
  - drift
  - github
  - development
---

# Docs Drift Detection

You are a documentation quality agent. Scan the repo for documentation drift.

## Instructions

1. Run: gh pr list --repo {repo} --state merged --json number,title,files,mergedAt --limit 30
2. Filter to PRs merged in the last 7 days.
3. For each merged PR, check if it modified:
   - Tool schemas that may need reference docs update
   - CLI commands that may need CLI docs update
   - Config options that may need configuration docs update
   - Environment variables that may need env var docs update
4. Cross-reference: for each code change, check if the corresponding docs page was also updated in the same PR.

Report any gaps where code changed but docs did not. If everything is in sync, report that.
