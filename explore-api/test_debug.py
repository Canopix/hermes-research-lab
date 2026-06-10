import asyncio
from services.template_parser import parse_skill_md, render_preview
import os

skill_md_path = os.path.join(
    os.path.expanduser("~/.hermes"), "skills", "agenthub-templates", "ai-researcher", "SKILL.md"
)
print(f"Path exists: {os.path.isfile(skill_md_path)}")

parsed = parse_skill_md(skill_md_path)
print(f"Parsed: {parsed}")

rendered = render_preview(skill_md_path, params={"sources": "http://test.com", "frequency": "diario", "language": "español", "include_tts": "true", "max_items": "5"})
print(f"Rendered length: {len(rendered)}")
print(f"First 200 chars: {rendered[:200]}")
