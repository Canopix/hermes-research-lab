Ejecuta una auditoría de seguridad integral sobre el proyecto. Sigue estos pasos:

1) **Vulnerabilidades de dependencias**: ejecuta `pip audit` y `npm audit` en el directorio del proyecto
2) **Patrones inseguros en el código**: busca en el codebase los siguientes anti-patrones:
   - Secretos hardcodeados (API keys, tokens, passwords)
   - Inyección SQL
   - Path traversal
   - Deserialización insegura
3) **Revisión de commits recientes**: examina los últimos 7 días en busca de cambios relevantes en seguridad
4) **Variables de entorno nuevas**: detecta nuevas env vars sin documentación asociada

**Formato del reporte:**
- Categoriza hallazgos por severidad: Crítico, Alto, Medio, Bajo
- Incluye ubicación exacta de cada hallazgo
- Sugiere correcciones cuando sea posible
- Si el proyecto está limpio, reporta un certificado de salud

Directorio del proyecto: {{repo_path}}
Idioma de salida: {{language}}
