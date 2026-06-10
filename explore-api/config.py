"""Configuration for the Exploration API."""

import os

HERMES_API_URL: str = "http://localhost:8642"
HERMES_API_KEY: str = "agenthub-local"
EXPLORE_API_PORT: int = 8643
CORS_ORIGINS: list[str] = ["http://localhost:3000"]

# Hardcoded to avoid HOME env var override from dispatcher
HERMES_HOME: str = "/root/.hermes"
