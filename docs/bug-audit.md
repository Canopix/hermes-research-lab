# AgentHub — Auditoría Completa de Bugs

> **Fecha:** 2026-06-13
> **Alcance:** Plugin dashboard, Frontend Next.js, Backend FastAPI, CLI scripts
> **Total archivos escaneados:** ~90

---

## 📡 Cómo aparecen los canales para otros usuarios

### Flujo de detección de canales

```
Backend lee ~/.hermes/config.yaml
  → gateway.platforms (dict)
  → Para cada plataforma: si existe y tiene config → se muestra como canal
  → Siempre incluye: local, origin (chat actual), all
```

### Escenarios por usuario

| Configuración del usuario | Canales que aparecen |
|--------------------------|---------------------|
| Sin config.yaml | `local`, `origin`, `all` (3 canales) |
| Sin `gateway.platforms` | `local`, `origin`, `all` |
| `telegram: {streaming: true}` (sin `enabled`) | `local`, `origin`, `all` ← **Telegram NO aparece** (bug corregido en system.py) |
| `telegram: {enabled: true, streaming: true}` | `local`, `origin`, `telegram`, `all` |
| Telegram + Discord configurados | `local`, `origin`, `telegram`, `discord`, `all` |
| `platforms` es un string en vez de dict | **Bug latente**: `"telegram" in "some string"` buscaría substring, no clave |

### Nota sobre el fix de system.py
El fix anterior (`"telegram" in platforms and platforms["telegram"]`) hace que Telegram aparezca **sin necesitar `enabled: true`**. Pero si `gateway.platforms` no existe o está vacío, no aparece ningún canal extra. Esto es correcto — no quieres ofrecer Telegram si no está configurado.

---

## 🐛 Bugs encontrados por categoría

### 🔴 CRÍTICOS (4)

#### C1: Double-toggle en checkboxes del plugin
**Archivo:** `plugin/agenthub/dashboard/dist/index.js` (L245, L289, L377)
**Impacto:** Los checkboxes de Skills, Toolsets y Delivery **no funcionan**. Al clicar, el evento onClick del div Y el onChange del checkbox disparan `onToggle()` dos veces, cancelándose mutuamente.

**Fix:** Eliminar `onChange` del `<Checkbox>` y dejar solo el `onClick` del div wrapper.

---

#### C2: Path traversal en endpoints de profiles/templates
**Archivos:** `explore-api/routers/profiles.py` (L119), `templates.py` (L184), `template_parser.py` (L184, L223)
**Impacto:** Un `template_id` o `name` como `../../etc/passwd` podría leer archivos fuera del directorio permitido.

```python
# profiles.py — riesgo real
profile_dir = _profiles_dir() / name  # name no está sanitizado

# templates.py — riesgo real  
base = Path(templates_dir) / template_id  # template_id no está sanitizado
```

**Fix:** Validar que los IDs solo contengan `[a-zA-Z0-9_-]`:
```python
import re
def _validate_id(id_str: str) -> str:
    if not re.match(r'^[a-zA-Z0-9_-]+$', id_str):
        raise HTTPException(400, "Invalid ID format")
    return id_str
```

---

#### C3: JSON injection en wizard.sh
**Archivo:** `scripts/wizard.sh` (L570-577)
**Impacto:** `AGENT_NAME`, `CONFIG_JSON`, `SELECTED_SCHEDULE` se interpolan directamente en JSON sin escapar. Un nombre con `"` rompe el JSON o inyecta datos.

```bash
# Riesgo real
-d "{\"name\": \"$AGENT_NAME\", ...}"
# Si AGENT_NAME = 'foo"}; malicious("x'); la cadena se rompe
```

**Fix:** Usar `jq` para construir JSON de forma segura.

---

#### C4: Componente DynamicParam duplicado con comportamiento distinto
**Archivos:** `frontend/src/components/DynamicParam.tsx` vs `frontend/src/components/builder/DynamicParam.tsx`
**Impacto:** El duplicado tiene labels en inglés ("Enable") mezclados con UI en español. Código muerto que genera confusión.

---

### 🟠 ALTOS (10)

#### H1: Provider inicializado con template ID
**Archivo:** `plugin/agenthub/dashboard/dist/index.js` (L457)
```javascript
var s2 = useState(tpl.id), provider = s2[0]  // tpl.id = "ai-researcher", no un provider
```
Si el usuario hace click en "Create" antes de que cargue el useEffect, el provider será `"ai-researcher"`.

---

#### H2: Chat ID / Thread ID nunca aparecen (backend plugin)
**Archivo:** `plugin/agenthub/dashboard/plugin_api.py` (L295-357)
**Impacto:** El endpoint `/channels` del plugin **nunca retorna** `supports_chat_id` o `supports_thread_id`. Los campos de Telegram son invisibles.

---

#### H3: API key expuesta en bundle del cliente
**Archivo:** `frontend/src/lib/api.ts` (L9), `frontend/src/hooks/useSSE.ts` (L172)
**Impacto:** `NEXT_PUBLIC_API_KEY='agenthub-local'` se incluye en el JS del navegador. Visible en DevTools.

---

#### H4: Sync I/O bloqueante en funciones async
**Archivos:** `system.py` (L84-86, L117), `extras.py` (L90, L46, L119), `profiles.py` (L71, L82), `job_outputs.py` (L77)
**Impacto:** `open()`, `read_text()`, `sqlite3.connect()` bloquean el event loop de asyncio. Degradación de rendimiento bajo carga.

---

#### H5: subprocess.run() síncrono en función async
**Archivo:** `profile_provision.py` (L83)
**Impacto:** Bloquea el event loop durante la ejecución del CLI hermes.

---

#### H6: Race condition en singleton hermes_client
**Archivo:** `hermes_client.py` (L187-192)
**Impacto:** Dos requests concurrentes pueden crear dos clientes. Falta `asyncio.Lock`.

---

#### H7: Sin auth en endpoints del plugin
**Archivo:** `plugin/agenthub/dashboard/plugin_api.py` (todos los endpoints)
**Impacto:** Cualquiera que alcance la API puede crear agents, modificar profiles, ejecutar cron jobs.

---

#### H8: OutputViewer modal sin accessibility
**Archivo:** `frontend/src/components/history/OutputViewer.tsx` (L27-89)
**Impacto:** Sin Escape handler, focus trap, `role="dialog"`, o `aria-modal`. Violación de accesibilidad.

---

#### H9: Path traversal en profiles.py
**Archivo:** `explore-api/routers/profiles.py` (L119)
**Impacto:** `GET /api/system/profiles/../../etc/passwd` podría leer SOUL.md, MEMORY.md, o config de cualquier perfil.

---

#### H10: start.sh mata procesos en puertos 3001-3003 sin verificar propiedad
**Archivo:** `scripts/start.sh` (L104-108)
**Impacto:** Mata cualquier proceso en esos puertos, no solo los de AgentHub.

---

### 🟡 MEDIOS (21)

| # | Archivo | Descripción |
|---|---------|-------------|
| M1 | `dist/index.js` (L52, L656) | ~~Color #f5f5f5~~ ✅ Ya corregido |
| M2 | `dist/index.js` (L135, L176, L329, L393) | Labels sin `htmlFor` — accesibilidad |
| M3 | `dist/index.js` (L245, L289, L377) | Clickable divs sin `tabIndex`, `role`, `onKeyDown` |
| M4 | `dist/index.js` (L116-120) | Tab buttons sin ARIA roles ni focus styles |
| M5 | `dist/index.js` (L684-723) | useEffect fetch sin cleanup/AbortController |
| M6 | `dist/index.js` (L746) | `fetchJSON` POST puede fallar si SDK solo soporta GET |
| M7 | `dist/index.js` (L693) | `setJobs` sin type checking — crash si respuesta no es objeto |
| M8 | `dist/index.js` (L726-733) | Wizard state no se resetea al cambiar template |
| M9 | `api.ts` (L20-25) | Solo 3 funciones usan timeout; ~15 no lo tienen |
| M10 | `api.ts` (L249) | `createJob` usa `any` en vez de `CreateJobPayload` |
| M11 | `api.ts` (L312) | `deleteJob` — `res.json()` puede fallar con body vacío |
| M12 | `create/page.tsx` (L217) | `prevStep` puede producir step 0 inválido |
| M13 | `agents/page.tsx` (L53-74) | Race condition sin cleanup en useEffect |
| M14 | `history/page.tsx` (L22-48) | Misma race condition |
| M15 | `api.ts` (L125, L380) | Funciones duplicadas `getSkills`/`getSkillsList` |
| M16 | `executions.py` (L39) | Paginación rota — `limit + offset` sin server-side offset |
| M17 | `executions.py` (L115) | `get_execution` retorna 200 con error dict en vez de 404 |
| M18 | `jobs.py` (L151-167) | `delete_job` retorna error si profile cleanup falla (aunque job ya se borró) |
| M19 | `main.py` (L58) | Comparación de API key no es constant-time (timing attack) |
| M20 | `extras.py` (L90) | Activity log se carga entero en memoria sin límite de tamaño |
| M21 | `session_db.py` (L55-56) | FTS query con f-string (whitelist mitiga, pero frágil) |

---

### 🔵 BAJOS (17)

| # | Archivo | Descripción |
|---|---------|-------------|
| L1 | `dist/index.js` (L652) | AgentsTab muestra raw text en vez de UI estructurada |
| L2 | `dist/index.js` (L729) | Flash de config vacía al cambiar template |
| L3 | `WizardStep.tsx` | Código muerto (duplicado de WizardStepper) |
| L4 | `Header.tsx` (L157-164) | Input de búsqueda no funcional |
| L5 | `ReportFeed.tsx` (L67-85) | Form controls sin aria-label |
| L6 | `templates/page.tsx` (L106-129) | Fetch directo en vez de usar API compartida |
| L7 | `SystemOverview.tsx` (L147) | Cast `as Record<string, any>` innecesario |
| L8 | `SkillsGrid.tsx` / `ToolsetsTab.tsx` | `getSkills` retorna `Promise<any>` |
| L9 | `AnimateIn.tsx` (L47) | setTimeout sin cleanup |
| L10 | `AgentCard.tsx` (L58) | `progress` puede ser NaN |
| L11 | `ToolsetsTab.tsx` (L101) | Keys potencialmente duplicadas |
| L12 | `CronTab.tsx` (L32) | Tipo no validado contra respuesta API |
| L13 | `AgentCardWithSSE.tsx` (L59) | SSE URL pasa por proxy sin auth headers |
| L14 | `history/page.tsx` | Sin auto-refresh |
| L15 | `ExecutionTable.tsx` (L29) | Importa `date-fns` — verificar dependencia |
| L16 | `plugin_api.py` (L473) | `import io` no usado dentro de función |
| L17 | `plugin_api.py` (L334-337) | Filtro de secrets incompleto (falta `password`, `access_token`) |

---

### 🐚 SCRIPTS (11)

| # | Severidad | Archivo | Descripción |
|---|-----------|---------|-------------|
| S1 | 🔴 | `wizard.sh` | JSON injection por interpolación directa |
| S2 | 🔴 | `wizard.sh` | Variables sin comillas en contextos string |
| S3 | 🟠 | `start.sh` (L97) | PID file en `/tmp/` — riesgo de symlink attack |
| S4 | 🟠 | `start.sh` (L104-108) | Mata procesos sin verificar propiedad |
| S5 | 🟠 | `start.sh` (L95) | `--reload` en modo producción |
| S6 | 🟠 | `stop.sh` (L31-37) | `kill -9` después de solo 1s de espera |
| S7 | 🟠 | `wizard.sh` (L2) | `set -e` + `read` = crash en EOF/pipa |
| S8 | 🟡 | `common.sh` | `lsof` dependency sin fallback |
| S9 | 🟡 | `setup.sh` (L94) | `ls -A` en test `[ ]` frágil |
| S10 | 🟡 | `wizard.sh` | `declare -A` requiere bash 4+ (no funciona en macOS stock) |
| S11 | 🟡 | `wizard.sh` | JSON manual en vez de `jq` |

---

## 📊 Resumen total

| Severidad | Plugin JS | Frontend | Backend Python | Scripts | **Total** |
|-----------|-----------|----------|----------------|---------|-----------|
| 🔴 Crítico | 1 | 1 | 3 | 2 | **7** |
| 🟠 Alto | 2 | 2 | 6 | 5 | **15** |
| 🟡 Medio | 8 | 7 | 9 | 4 | **28** |
| 🔵 Bajo | 3 | 14 | 2 | 0 | **19** |
| **Total** | **14** | **24** | **20** | **11** | **69** |

---

## 🎯 Top 5 prioridades inmediatas

1. **C1 — Double-toggle checkbox** → Los usuarios no pueden seleccionar skills/toolsets/delivery. Fix de 1 línea.
2. **C2 — Path traversal** → Vulnerabilidad de seguridad. Validar IDs con regex.
3. **H2 — Chat ID/Thread ID no aparecen** → Telegram delivery imposible desde el plugin. Añadir campos al backend.
4. **M9 — Missing timeouts** → UI se cuelga si el backend no responde. Añadir `AbortSignal.timeout()`.
5. **C3 — JSON injection en wizard** → Usar `jq` para construir JSON seguro.
