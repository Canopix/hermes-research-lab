Vigila repositorios de agentes de IA en busca de actividad destacada. Para cada repositorio en {{repos}}, ejecuta:

1) `gh pr list --repo <repo> --state all --json number,title,author,createdAt,mergedAt --limit 15`
2) `gh issue list --repo <repo> --state open --json number,title,labels,createdAt --limit 10`

**Enfócate en:**
- Nuevas funcionalidades
- Cambios arquitectónicos
- Patrones de integración
- Correcciones de seguridad

**Ignora:**
- Actualizaciones rutinarias de dependencias
- Changesets triviales

Si no hay nada notable, indícalo brevemente.

Organiza el reporte por repositorio con un análisis conciso de cada uno.

Repositorios a vigilar: {{repos}}
Idioma de salida: {{language}}
