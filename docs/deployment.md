---
tags: [project, hackathon, agenthub, deployment]
status: active
created: 2026-06-09
updated: 2026-06-09
up: "[[🎯 Hackathon AgentHub]]"
---

# 🚀 Deployment — AgentHub

---

## Público objetivo

**Personas que ya usan Hermes Agent.** Ya tienen Hermes instalado, configurado, con provider, plataformas conectadas, etc.

AgentHub se instala **encima** de su Hermes existente. No reemplaza nada, no toca su config, solo añade interfaz web.

---

## Dependencias del CLI
- bash 4+
- curl
- jq (para construcción segura de JSON)
- Python 3.10+
- Node.js 18+

---

## Instalación (1 comando)

```bash
# El usuario ejecuta esto en su máquina
pip install agenthub

# O desde el repo
git clone https://github.com/TU_USUARIO/agenthub.git
cd agenthub
pip install -e .
```

Esto instala:
- Los templates como skills en `~/.hermes/skills/`
- El hook de monitoreo en `~/.hermes/hooks/`
- El CLI `agenthub` en el PATH

---

## Uso

```bash
# Iniciar la plataforma web
agenthub start

# Abre automáticamente http://localhost:3000
# Se conecta a Hermes en :8642 (ya corriendo)
```

El usuario no necesita hacer nada más. Su Hermes sigue corriendo como siempre. AgentHub se conecta a él y le da interfaz web.

---

## Qué necesita el usuario tener

| Requisito | Ya lo tiene? | Cómo verificarlo |
|-----------|-------------|-----------------|
| Hermes instalado | ✅ Sí | `hermes --version` |
| Provider configurado | ✅ Sí | `hermes config get provider` |
| API Server habilitado | ❓ Puede que no | `hermes config get api_server.enabled` |
| API key del provider | ✅ Sí | Está en `~/.hermes/.env` |

### Si el API Server no está habilitado

```bash
hermes config set api_server.enabled true
hermes config set api_server.port 8642
hermes config set api_server.api_server_key "agenthub-local"
hermes config set api_server.cors_origins '["http://localhost:3000"]'
```

AgentHub puede hacer esto automáticamente al primer arranque.

---

## El `agenthub` CLI

### Wizard interactivo (9 pasos)

El wizard CLI (`scripts/wizard.sh`) guía al usuario en 9 pasos para crear un agente:

1. **Selección de template** — galería de templates disponibles
2. **Parámetros** — configurar params del template
3. **Provider/Modelo** — elegir provider y modelo de `config.yaml`
4. **Skills** — multi-select de skills con búsqueda
5. **Toolsets** — selección de herramientas
6. **Schedule** — presets (30m, 1h, 6h, diario, semanal) + cron personalizado
7. **Delivery** — local, chat actual, Telegram (con chat_id/thread_id), all
8. **Preview** — ver el payload JSON antes de crear
9. **Crear** — ejecuta `hermes cron create` con el payload completo

```bash
# Ejecutar el wizard
bash scripts/wizard.sh
```

### Comandos CLI

```bash
# Ver comandos disponibles
agenthub --help

# Instalar templates y hook
agenthub setup

# Iniciar la plataforma
agenthub start

# Iniciar en puerto específico
agenthub start --port 4000

# Ver estado de Hermes
agenthub status

# Desinstalar (limpia templates y hook)
agenthub uninstall
```

---

## Qué hace `agenthub start`

```
1. Verifica que Hermes está corriendo (curl :8642/health)
   → Si no está: avisa y para

2. Habilita el API Server si no está habilitado
   → Configura CORS, API key, puerto

3. Instala templates como skills
   → Copia SKILL.md a ~/.hermes/skills/agenthub-templates/

4. Instala hook de monitoreo
   → Copia HOOK.yaml + handler.py a ~/.hermes/hooks/

5. Inicia Exploration API (:8643)
   → FastAPI en background

6. Inicia Frontend (:3000)
   → Next.js en background

7. Abre el navegador
   → http://localhost:3000
```

---

## Estructura en la máquina del usuario

```
~/.hermes/                          ← Ya existe, no lo tocamos
├── config.yaml                     ← Solo añadimos api_server si falta
├── .env                            ← No lo tocamos
├── state.db                        ← No lo tocamos
├── profiles/                       ← No lo tocamos
├── skills/                         ← Añadimos agenthub-templates/
│   ├── agenthub-templates/
│   │   ├── ai-researcher/
│   │   │   └── SKILL.md
│   │   ├── repo-monitor/
│   │   │   └── SKILL.md
│   │   ├── paper-summarizer/
│   │   │   └── SKILL.md
│   │   └── competitor-watcher/
│   │       └── SKILL.md
│   └── ... (skills existentes del usuario)
├── hooks/                          ← Añadimos agent-monitor/
│   ├── agent-monitor/
│   │   ├── HOOK.yaml
│   │   └── handler.py
│   └── ... (hooks existentes del usuario)
└── ... (todo lo demás sin cambios)

/tmp/agenthub/                      ← Donde corre lo nuestro
├── explore-api/
│   ├── main.py
│   ├── routers/
│   └── services/
└── frontend/
    ├── src/
    └── package.json
```

---
---

## Instalación del Plugin
```bash
bash scripts/install-plugin.sh
```
Esto copia el plugin a `~/.hermes/plugins/agenthub/` y reinicia el dashboard.

---

## Resumen

```bash
pip install agenthub
agenthub start
```

**AgentHub es un plugin de Hermes. Se instala encima de lo que ya tienes.**
