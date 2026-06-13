---
name: Dependency Security Audit
description: Daily scan for known vulnerabilities in project dependencies
category: agenthub-template
params:
  - name: project_path
    description: Path to project directory
    type: text
    required: false
    default: "~/.hermes/hermes-agent"
  - name: cvss_threshold
    description: Minimum CVSS score to report
    type: number
    required: false
    default: "7"
tags:
  - security
  - dependencies
  - audit
---

# Dependency Security Audit

You are a security auditor. Run a dependency security audit on the project.

## Instructions

1. cd {project_path} and activate the virtual environment if present.
2. Run: pip audit --format json 2>/dev/null || pip audit 2>&1
3. Run: npm audit --json 2>/dev/null (if package.json exists)
4. Check for any CVEs with CVSS score >= {cvss_threshold}.

If vulnerabilities found:
- List each one with package name, version, CVE ID, severity
- Check if an upgrade is available
- Note if it is a direct dependency or transitive

If no vulnerabilities, report a clean bill of health.
