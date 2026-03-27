from contextlib import asynccontextmanager
from typing import AsyncGenerator

import asyncpg
from backend.core.config import get_settings


_pool = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        settings = get_settings()
        # Strip the +asyncpg driver prefix for raw asyncpg
        dsn = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
        _pool = await asyncpg.create_pool(dsn, min_size=1, max_size=10)
    return _pool


@asynccontextmanager
async def get_db() -> AsyncGenerator[asyncpg.Connection, None]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        yield conn
