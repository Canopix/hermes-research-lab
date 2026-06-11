#!/usr/bin/env python3
"""Quick smoke test for template_parser and templates router."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.template_parser import scan_templates, parse_skill_md, render_preview

HERMES_TEMPLATES = os.path.expanduser("~/.hermes/skills/agenthub-templates")

# Test scan
templates = scan_templates()
print(f"Templates found: {len(templates)}")
for t in templates:
    print(f"  - {t['id']}: {t['name']} (icon={t['icon']})")

print()

# Test parse
parsed = parse_skill_md(os.path.join(HERMES_TEMPLATES, "ai-researcher/SKILL.md"))
print(f"Parsed ai-researcher:")
print(f"  name={parsed['name']}")
print(f"  params count={len(parsed['params'])}")
print(f"  hermes_config={parsed['hermes_config']}")

print()

# Test preview
rendered = render_preview(os.path.join(HERMES_TEMPLATES, "ai-researcher/SKILL.md"))
print(f"Preview rendered (first 300 chars):")
print(rendered[:300])

print()

# Test 404 case
not_found = parse_skill_md(os.path.join(HERMES_TEMPLATES, "nonexistent/SKILL.md"))
print(f"Non-existent template returns: {not_found}")

print()
print("All basic tests passed!")
