#!/usr/bin/env python3
"""Test YAML error handling returns 500."""
import sys, os, shutil
sys.path.insert(0, "/root/agenthub/explore-api")

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# Create a bad template temporarily
bad_dir = "/root/.hermes/skills/agenthub-templates/bad-template-test"
os.makedirs(bad_dir, exist_ok=True)
with open(os.path.join(bad_dir, "SKILL.md"), "w") as f:
    f.write("---\nname: bad\nthis is: [not: valid: yaml: :\n---\nbody\n")

# Test detail endpoint returns 500
r = client.get("/api/templates/bad-template-test")
print(f"Detail bad template: status={r.status_code}")
print(f"  response: {r.json()}")
assert r.status_code == 500, f"Expected 500, got {r.status_code}"
assert "YAML parsing error" in r.json()["detail"]

# Test preview endpoint returns 500
r = client.get("/api/templates/bad-template-test/preview")
print(f"Preview bad template: status={r.status_code}")
print(f"  response: {r.json()}")
assert r.status_code == 500, f"Expected 500, got {r.status_code}"
assert "YAML parsing error" in r.json()["detail"]

# Catalog should skip bad template
r = client.get("/api/templates")
print(f"Catalog: status={r.status_code}, count={len(r.json())}")
assert r.status_code == 200
assert len(r.json()) == 4  # bad one skipped

# Cleanup
shutil.rmtree(bad_dir)

# Re-test all normal endpoints after cleanup
r = client.get("/api/templates")
assert r.status_code == 200
assert len(r.json()) == 4

r = client.get("/api/templates/ai-researcher")
assert r.status_code == 200
assert r.json()["name"] == "ai-researcher"

r = client.get("/api/templates/ai-researcher/preview")
assert r.status_code == 200
assert "prompt" in r.json()

r = client.get("/api/templates/nonexistent")
assert r.status_code == 404

r = client.get("/api/templates/nonexistent/preview")
assert r.status_code == 404

print("\nAll error-handling tests passed!")
