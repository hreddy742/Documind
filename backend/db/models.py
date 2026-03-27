CREATE_DOCUMENTS_TABLE = """
CREATE TABLE IF NOT EXISTS documents (
    doc_id      TEXT PRIMARY KEY,
    filename    TEXT NOT NULL,
    chunks      INTEGER NOT NULL DEFAULT 0,
    strategy    TEXT NOT NULL DEFAULT 'fixed',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    size_bytes  INTEGER NOT NULL DEFAULT 0
);
"""


async def create_tables(conn):
    await conn.execute(CREATE_DOCUMENTS_TABLE)


async def insert_document(conn, doc_id: str, filename: str, chunks: int,
                          strategy: str, size_bytes: int):
    await conn.execute(
        """
        INSERT INTO documents (doc_id, filename, chunks, strategy, size_bytes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (doc_id) DO UPDATE
        SET filename = $2, chunks = $3, strategy = $4, size_bytes = $5
        """,
        doc_id, filename, chunks, strategy, size_bytes
    )


async def delete_document(conn, doc_id: str):
    await conn.execute("DELETE FROM documents WHERE doc_id = $1", doc_id)
