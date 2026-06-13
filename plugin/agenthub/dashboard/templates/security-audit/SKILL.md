---
name: Security Audit Pipeline
description: Run comprehensive security audit with dependency scanning and code review
category: agenthub-template
params:
  - name: repo_path
    description: Path to project directory
    type: text
    required: false
    default: ~/.hermes/hermes-agent
  - name: language
    description: Output language
    type: select
    required: true
    options:
      - español
      - english
    default: español
tags:
  - security
  - audit
  - pipeline
---

Run comprehensive security audit. Follow these steps:

1) **Dependency vulnerabilities**: run `pip audit` and `npm audit` in the project directory
2) **Insecure code patterns**: search the codebase for these anti-patterns:
   - Hardcoded secrets (API keys, tokens, passwords)
   - SQL injection
   - Path traversal
   - Unsafe deserialization
3) **Recent commit review**: examine the last 7 days for security-relevant changes
4) **New environment variables**: detect new env vars without documentation

**Report format:**
- Categorize findings by severity: Critical, High, Medium, Low
- Include exact location of each finding
- Suggest fixes where possible
- If the project is clean, issue a clean bill of health

Project directory: {repo_path}
Output language: {language}
