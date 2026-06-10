# AgentHub E2E Tests

Suite de tests end-to-end para AgentHub. Hermética: usa `HERMES_HOME` temporal, no toca el `~/.hermes` real.

## Requisitos

```bash
# Dentro del venv de explore-api (que ya tiene fastapi/uvicorn/httpx/pyyaml)
pip install -r tests/requirements-test.txt
```

## Ejecución

```bash
# Todos los tests
pytest tests/e2e -v

# Tests de creación de agentes (sin LLM real)
pytest tests/e2e/test_create_flow.py -v
```

## Test opt-in con LLM real

Requiere `hermes` en PATH y un provider configurado:

```bash
RUN_LLM_E2E=1 pytest tests/e2e/test_hermes_launch.py -v
```

Este test hace llamadas reales al LLM y puede tardar hasta 120s.