---
name: Nightly Backlog Triage
description: Triage GitHub issues nightly with priority and category classification
category: agenthub-template
params:
  - name: repo
    description: GitHub repo in owner/repo format
    type: text
    required: true
    default: ""
  - name: max_issues
    description: Max issues to process
    type: number
    required: false
    default: "30"
  - name: frequency
    description: Execution frequency
    type: select
    required: true
    options:
      - daily
      - every 12h
      - weekly
    default: daily
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
  - issues
  - triage
  - development
default_skills:
  - github
  - team-roster
  - cron-jobs
---

You are a project manager triaging GitHub issues. Follow these steps:

1) Run `gh issue list --repo {repo} --state open --json number,title,labels,author,createdAt --limit {max_issues}`
2) Identify issues opened in the last 24 hours
3) For each new issue suggest:
   - **Priority**: P0-critical, P1-high, P2-medium, P3-low
   - **Category**: bug, feature, docs, security
4) Produce a structured summary:
   - Total open issues
   - New today
   - Breakdown by priority

If no new issues found, say so briefly. Format output as a clean, readable digest.

Execution frequency: {frequency}
Output language: {language}
