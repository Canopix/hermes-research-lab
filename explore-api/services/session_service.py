import os
import sqlite3
from pathlib import Path
from typing import Optional

from services.hermes_reader import get_hermes_dir


class SessionService:
    @staticmethod
    def _get_db_path() -> Path:
        return get_hermes_dir() / "state.db"

    @classmethod
    def search_messages(cls, query: str, limit: int = 20) -> list[dict]:
        db_path = cls._get_db_path()
        if not db_path.exists():
            return []

        try:
            conn = sqlite3.connect(str(db_path))
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Try FTS5 search first
            try:
                cursor.execute(
                    """
                    SELECT m.session_id, s.title, m.content as snippet
                    FROM messages_fts fts
                    JOIN messages m ON m.rowid = fts.rowid
                    LEFT JOIN sessions s ON s.id = m.session_id
                    WHERE messages_fts MATCH ?
                    LIMIT ?
                    """,
                    (query, limit),
                )
                results = [dict(row) for row in cursor.fetchall()]
                if results:
                    conn.close()
                    return results
            except sqlite3.OperationalError:
                pass

            # Fallback to LIKE search
            cursor.execute(
                """
                SELECT m.session_id, s.title, m.content as snippet
                FROM messages m
                LEFT JOIN sessions s ON s.id = m.session_id
                WHERE m.content LIKE ?
                LIMIT ?
                """,
                (f"%{query}%", limit),
            )
            results = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return results

        except Exception:
            return []
