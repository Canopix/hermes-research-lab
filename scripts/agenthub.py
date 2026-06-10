#!/usr/bin/env python3
"""AgentHub CLI - Gestiona el ecosistema AgentHub."""

import argparse
import subprocess
import sys
import os

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))


def main():
    parser = argparse.ArgumentParser(
        description="AgentHub CLI - Gestiona el ecosistema AgentHub",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "\nComandos:\n"
            "  setup    Instala dependencias y configura todo el ecosistema\n"
            "  start    Levanta Exploration API + Frontend\n"
            "  stop     Detiene todos los servicios\n"
            "  status   Muestra el estado de los servicios\n"
            "  demo     Ejecuta la demo automatizada para el jurado\n"
            "\nEjemplos:\n"
            "  agenthub setup\n"
            "  agenthub start\n"
            "  agenthub status\n"
            "  agenthub demo\n"
        ),
    )
    parser.add_argument(
        "command",
        choices=["setup", "start", "stop", "status", "demo"],
        help="Comando a ejecutar",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Mostrar output detallado",
    )

    args = parser.parse_args()

    script_map = {
        "setup": "setup.sh",
        "start": "start.sh",
        "stop": "stop.sh",
        "status": "status.sh",
        "demo": "demo.sh",
    }

    script_path = os.path.join(SCRIPTS_DIR, script_map[args.command])

    if not os.path.exists(script_path):
        print(f"Error: Script no encontrado: {script_path}", file=sys.stderr)
        sys.exit(1)

    cmd = ["bash", script_path]
    if args.verbose:
        cmd.insert(1, "-x")

    result = subprocess.run(cmd)
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
