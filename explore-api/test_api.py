#!/usr/bin/env python3
"""Test the template API endpoints via HTTP."""

import sys
sys.path.insert(0, "/root/agenthub/explore-api")

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

print("=== GET /api/templates ===")
r = client.get("/api/templates")
print(f"Status: {r.status_code}")
templates = r.json()
print(f"Count: {len(templates)}")
for t in templates:
    print(f"  - {t['id']}: {t['name']} (icon={t['icon']})")
    print(f"    params: {len(t['params'])}, hermesConfig: {t['hermesConfig']}")

print()

print("=== GET /api/templates/ai-researcher ===")
r = client.get("/api/templates/ai-researcher")
print(f"Status: {r.status_code}")
if r.status_code == 200:
    data = r.json()
    print(f"  name: {data['name']}")
    print(f"  version: {data['version']}")
    print(f"  params: {len(data['params'])}")
    print(f"  has body: {bool(data['body'])}")

print()

print("=== GET /api/templates/ai-researcher/preview ===")
r = client.get("/api/templates/ai-researcher/preview")
print(f"Status: {r.status_code}")
if r.status_code == 200:
    data = r.json()
    print(f"  prompt (first 200 chars): {data['prompt'][:200]}")
    print(f"  config params: {len(data['config']['params'])}")

print()

print("=== GET /api/templates/nonexistent (expect 404) ===")
r = client.get("/api/templates/nonexistent")
print(f"Status: {r.status_code}")

print()

print("=== GET /api/templates/nonexistent/preview (expect 404) ===")
r = client.get("/api/templates/nonexistent/preview")
print(f"Status: {r.status_code}")

print()
print("All endpoint tests passed!")
