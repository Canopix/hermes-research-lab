"""FTS5 search over ~/.hermes/state.db for session lookup."""

from __future__ import annotations

import sqlite3
from pathlib import Path

from config import HERMES_HOME


def _get_db_path() -> Path:
    """Return the path to the hermes state database."""
    return Path(HERMES_HOME) / "state.db"


def search_sessions(query: str, limit: int = 20) -> list[dict]:
    """Perform an FTS5 search on the sessions table.

    Tries multiple table/column combinations since the exact schema
    may vary. Returns a list of session dicts.
    """
    db_path = _get_db_path()
    if not db_path.is_file():
        return []

    results: list[dict] = []
    search_term = query.strip()
    if not search_term:
        return results

    try:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        # Try FTS5 search first — common table names
        fts_tables = ["sessions_fts", "sessions", "task_sessions"]
        fts_columns = ["content", "title", "query", "message", "text", "description"]

        for table in fts_tables:
            try:
                cur.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                    (table,),
                )
                if cur.fetchone() is None:
                    continue

                col = fts_columns[0]
                for c in fts_columns:
                    try:
                        cur.execute(
                            f"SELECT {c} FROM {table} WHERE {table} MATCH ?",
                            (search_term,),
                        )
                        if cur.fetchone() is not None:
                            col = c
                            break
                    except sqlite3.OperationalError:
                        continue

                cur.execute(
                    f"SELECT * FROM {table} WHERE {table} MATCH ?",
                    (search_term,),
                )
                rows = cur.fetchall()
                results = [dict(row) for row in rows[:limit]]
                break

            except sqlite3.OperationalError:
                continue

        # Fallback: try a LIKE search on any table with 'session' in the name
        if not results:
            try:
                cur.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%session%'"
                )
                tables = [row[0] for row in cur.fetchall()]
                for table in tables:
                    try:
                        cur.execute(
                            f"SELECT * FROM {table} WHERE content LIKE ? LIMIT ?",
                            (f"%{search_term}%", limit),
                        )
                        rows = cur.fetchall()
                        if rows:
                            results = [dict(row) for row in rows]
                            break
                    except sqlite3.OperationalError:
                        continue
            except sqlite3.OperationalError:
                pass

        conn.close()

    except (sqlite3.Error, OSError):
        return []

    return results
