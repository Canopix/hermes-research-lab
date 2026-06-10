"""Configuration for the Exploration API."""

import os

HERMES_API_URL: str = os.environ.get("HERMES_API_URL", "http://localhost:8642")
HERMES_API_KEY: str = os.environ.get("HERMES_API_KEY", "agenthub-local")
EXPLORE_API_PORT: int = int(os.environ.get("EXPLORE_API_PORT", "8643"))
CORS_ORIGINS: list[str] = ["http://localhost:3000"]
HERMES_HOME: str = os.environ.get("HERMES_HOME", os.path.expanduser("~/.hermes"))
