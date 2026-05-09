# DocuMind

DocuMind is an open-source document intelligence application for uploading
PDF, DOCX, and text files, asking natural-language questions, and receiving
answers grounded in retrieved source passages. The project combines a React
frontend with a FastAPI backend, Qdrant vector search, PostgreSQL document
metadata, BM25 keyword retrieval, sentence-transformer embeddings, cross-encoder
reranking, Ollama-powered generation, and hallucination risk scoring.

The goal is to provide a practical Retrieval-Augmented Generation (RAG)
reference app that is local-first, inspectable, and deployable without relying
on hosted LLM APIs.

## Features

- Upload PDF, DOCX, and TXT documents up to 50 MB.
- Choose between fixed, semantic, and sentence-window chunking strategies.
- Generate local embeddings with `BAAI/bge-small-en-v1.5`.
- Store vectorized chunks and payloads in Qdrant.
- Persist document metadata in PostgreSQL.
- Combine dense vector search with BM25 sparse search through Reciprocal Rank
  Fusion.
- Rerank retrieved chunks with `cross-encoder/ms-marco-MiniLM-L-6-v2`.
- Generate cited answers with Ollama and `llama3.2:3b`.
- Stream answers to the frontend with Server-Sent Events.
- Score answer support with an NLI-based hallucination risk classifier.
- Display source cards, relevance indicators, risk badges, and latency metrics.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Axios, lucide-react |
| API | FastAPI, Pydantic, Uvicorn |
| LLM | Ollama via LangChain (`langchain-ollama`) |
| Embeddings | Sentence Transformers (`BAAI/bge-small-en-v1.5`) |
| Retrieval | Qdrant, BM25 (`rank_bm25`), Reciprocal Rank Fusion |
| Reranking | Sentence Transformers CrossEncoder |
| Hallucination scoring | `cross-encoder/nli-deberta-v3-small` |
| Documents | `pypdf`, `python-docx` |
| Database | PostgreSQL 16, `asyncpg` |
| Containers | Docker, Docker Compose |
| Deployment configs | Railway backend config, Fly.io Ollama config |

## Architecture

```text
Browser
  |
  | React + Vite UI
  v
FastAPI backend
  |
  |-- /documents/upload
  |     Extract text -> chunk -> embed -> store vectors in Qdrant
  |     Store metadata in PostgreSQL
  |     Write BM25 cache to bm25_cache/{doc_id}.pkl
  |
  |-- /query and /query/stream
        Embed question
        Dense search in Qdrant
        Sparse BM25 search
        RRF fusion
        Cross-encoder reranking
        Ollama answer generation
        NLI hallucination scoring
```

### Data Flow

1. A user uploads a document from the frontend.
2. The backend extracts text from PDF, DOCX, or TXT content.
3. The selected chunker creates searchable chunks.
4. Embeddings are generated locally and stored in Qdrant with chunk payloads.
5. A document metadata row is inserted into PostgreSQL.
6. A BM25 index is serialized to `bm25_cache/`.
7. At query time, the backend retrieves relevant chunks, reranks them, builds a
   cited prompt, streams tokens from Ollama, and scores the final answer against
   retrieved sources.

## Repository Structure

```text
.
|-- backend/
|   |-- api/
|   |   |-- main.py              # FastAPI app, startup lifecycle, routers
|   |   |-- schemas.py           # Request and response models
|   |   `-- routes/              # Health, document, and query endpoints
|   |-- core/
|   |   |-- config.py            # Pydantic settings and defaults
|   |   `-- logging.py           # Application logging setup
|   |-- db/
|   |   |-- database.py          # asyncpg connection pool
|   |   `-- models.py            # documents table DDL and helpers
|   |-- evaluation/
|   |   `-- metrics.py           # Offline evaluation helpers
|   |-- generation/
|   |   |-- chain.py             # Ollama RAG chain and streaming
|   |   |-- hallucination.py     # NLI hallucination risk scoring
|   |   `-- prompts.py           # RAG system prompt and context formatting
|   |-- ingestion/
|   |   |-- chunking.py          # Fixed, semantic, and sentence-window chunkers
|   |   |-- embeddings.py        # SentenceTransformer model loading
|   |   `-- pipeline.py          # End-to-end ingestion pipeline
|   |-- retrieval/
|   |   |-- hybrid.py            # Dense + sparse retrieval and RRF
|   |   |-- reranker.py          # Cross-encoder reranker
|   |   `-- vector_store.py      # Qdrant collection and search wrapper
|   |-- Dockerfile
|   `-- requirements.txt
|-- frontend/
|   |-- src/
|   |   |-- api/client.ts        # HTTP and SSE API client
|   |   |-- components/          # Upload, document list, query, answer UI
|   |   |-- hooks/               # Document and query state hooks
|   |   |-- types/               # Shared frontend TypeScript types
|   |   |-- App.tsx
|   |   `-- main.tsx
|   |-- package.json
|   |-- tailwind.config.js
|   `-- vite.config.ts
|-- infra/
|   `-- fly.toml                # Ollama deployment config for Fly.io
|-- docker-compose.yml          # Local multi-service stack
|-- railway.json                # Backend deployment config
|-- .env.example
`-- README.md
```

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ and npm, if running the frontend outside Docker
- Python 3.11+, if running the backend outside Docker
- Git

The first backend startup may download large model files from Hugging Face.
Ollama also needs the configured chat model to be pulled before queries work.

## Environment Configuration

Copy the example file before running the project:

```bash
cp .env.example .env
```

### Backend Variables

| Variable | Default | Description |
| --- | --- | --- |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server base URL. |
| `OLLAMA_MODEL` | `llama3.2:3b` | Chat model used for answer generation. |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant API URL. |
| `QDRANT_API_KEY` | empty | Optional key for Qdrant Cloud or secured Qdrant. |
| `QDRANT_COLLECTION` | `documind` | Qdrant collection for document chunks. |
| `EMBED_MODEL` | `BAAI/bge-small-en-v1.5` | Sentence-transformer embedding model. |
| `EMBED_DIM` | `384` | Embedding dimension expected by Qdrant. |
| `CHUNK_SIZE` | `512` | Intended fixed chunk size. |
| `CHUNK_OVERLAP` | `50` | Intended fixed chunk overlap. |
| `TOP_K_RETRIEVE` | `10` | Intended retrieval candidate count. |
| `TOP_K_RERANK` | `3` | Intended reranked context count. |
| `RRF_K` | `60` | Reciprocal Rank Fusion constant. |
| `DATABASE_URL` | `postgresql+asyncpg://postgres:password@localhost:5432/documind` | PostgreSQL connection string. |
| `LOG_LEVEL` | `INFO` | Python logging level. |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Intended allowed frontend origins. |

### Frontend Variable

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Backend API base URL for browser requests. Use `http://localhost:8000` for a native backend. In Docker Compose this is intentionally blank so Vite can proxy requests inside the Compose network. |

### Docker Compose `.env`

When the backend runs inside Docker Compose, it must use service names instead
of host-local ports:

```env
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=llama3.2:3b

QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=
QDRANT_COLLECTION=documind

DATABASE_URL=postgresql+asyncpg://postgres:password@postgres:5432/documind

LOG_LEVEL=INFO
CORS_ORIGINS=["http://localhost:3010","http://localhost:3000"]
```

When running the backend directly on your host while Compose provides only the
datastores, use the mapped host ports:

```env
OLLAMA_URL=http://localhost:11440
QDRANT_URL=http://localhost:6340
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5442/documind
```

## Running Locally with Docker Compose

1. Create `.env` and set the Compose service URLs shown above.

2. Start the stack:

   ```bash
   docker compose up -d --build
   ```

3. Pull the Ollama model:

   ```bash
   docker compose exec ollama ollama pull llama3.2:3b
   ```

4. Open the application:

   - Frontend: <http://localhost:3010>
   - Backend API docs: <http://localhost:8020/docs>
   - Backend health: <http://localhost:8020/health>
   - Qdrant: <http://localhost:6340/dashboard>

The Compose stack exposes:

| Service | Container Port | Host Port |
| --- | ---: | ---: |
| Frontend | `3000` | `3010` |
| Backend | `8000` | `8020` |
| Ollama | `11434` | `11440` |
| Qdrant | `6333` | `6340` |
| PostgreSQL | `5432` | `5442` |

## Running Locally Without Docker for the App

You can run PostgreSQL, Qdrant, and Ollama with Compose, then run the backend
and frontend natively for faster development feedback.

1. Start dependencies:

   ```bash
   docker compose up -d ollama qdrant postgres
   docker compose exec ollama ollama pull llama3.2:3b
   ```

2. Configure `.env` for host ports:

   ```env
   OLLAMA_URL=http://localhost:11440
   QDRANT_URL=http://localhost:6340
   DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5442/documind
   ```

3. Install and run the backend:

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt
   uvicorn backend.api.main:app --reload --host 0.0.0.0 --port 8000
   ```

4. Install and run the frontend in another terminal:

   ```bash
   cd frontend
   npm install
   VITE_API_URL=http://localhost:8000 npm run dev
   ```

5. Open <http://localhost:3000>.

## API Reference

Set a local API URL for the examples below:

```bash
export API_URL=http://localhost:8020
```

Use `http://localhost:8000` instead if the backend is running natively.

### Health Check

```http
GET /health
```

```bash
curl "$API_URL/health"
```

Example response:

```json
{
  "status": "ok",
  "model": "llama3.2:3b",
  "ollama_url": "http://ollama:11434"
}
```

### Upload a Document

```http
POST /documents/upload
Content-Type: multipart/form-data
```

Form fields:

| Field | Required | Description |
| --- | --- | --- |
| `file` | Yes | PDF, DOCX, or TXT file. Maximum 50 MB. |
| `strategy` | No | `fixed`, `semantic`, or `sentence_window`. Defaults to `fixed`. |

```bash
curl -X POST "$API_URL/documents/upload" \
  -F "file=@sample.pdf" \
  -F "strategy=fixed"
```

Example response:

```json
{
  "doc_id": "b6d7ef93-3f7b-4a64-9ef5-4706b4ac3ef0",
  "filename": "sample.pdf",
  "chunks_created": 42,
  "strategy": "fixed",
  "total_ms": 8342
}
```

### List Documents

```http
GET /documents/
```

```bash
curl "$API_URL/documents/"
```

Example response:

```json
[
  {
    "doc_id": "b6d7ef93-3f7b-4a64-9ef5-4706b4ac3ef0",
    "filename": "sample.pdf",
    "chunks": 42,
    "strategy": "fixed",
    "created_at": "2026-05-10T03:30:00.000000+00:00",
    "size_bytes": 982312
  }
]
```

### Query a Document

```http
POST /query/
Content-Type: application/json
```

```bash
curl -X POST "$API_URL/query/" \
  -H "Content-Type: application/json" \
  -d '{
    "doc_id": "b6d7ef93-3f7b-4a64-9ef5-4706b4ac3ef0",
    "question": "What are the key findings?",
    "stream": false
  }'
```

Example response:

```json
{
  "answer": "The document identifies three key findings [1]...",
  "citations": [
    {
      "number": 1,
      "text": "The report identifies...",
      "filename": "sample.pdf",
      "page_num": 2
    }
  ],
  "hallucination": {
    "risk": "low",
    "score": 0.82,
    "explanation": "Answer is well-supported by sources"
  },
  "metrics": {
    "retrieval_ms": 91,
    "rerank_ms": 117,
    "generation_ms": 4312,
    "total_ms": 4588
  }
}
```

### Stream a Query

```http
POST /query/stream
Content-Type: application/json
Accept: text/event-stream
```

```bash
curl -N -X POST "$API_URL/query/stream" \
  -H "Content-Type: application/json" \
  -d '{
    "doc_id": "b6d7ef93-3f7b-4a64-9ef5-4706b4ac3ef0",
    "question": "Summarize this document",
    "stream": true
  }'
```

SSE events:

| Event | Payload |
| --- | --- |
| `sources` | Retrieved source previews before generation starts. |
| `token` | One streamed answer token or token fragment. |
| `complete` | Final hallucination risk payload. |

### Delete a Document

```http
DELETE /documents/{doc_id}
```

```bash
curl -X DELETE "$API_URL/documents/b6d7ef93-3f7b-4a64-9ef5-4706b4ac3ef0"
```

The delete endpoint removes matching Qdrant points, deletes the BM25 cache file,
and removes the PostgreSQL metadata row.

## Database and Storage

DocuMind uses three storage layers:

- PostgreSQL stores document metadata in a single `documents` table.
- Qdrant stores embeddings and chunk payloads.
- `bm25_cache/` stores serialized BM25 indexes by document ID.

The backend creates the PostgreSQL table automatically on startup:

```sql
CREATE TABLE IF NOT EXISTS documents (
    doc_id      TEXT PRIMARY KEY,
    filename    TEXT NOT NULL,
    chunks      INTEGER NOT NULL DEFAULT 0,
    strategy    TEXT NOT NULL DEFAULT 'fixed',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    size_bytes  INTEGER NOT NULL DEFAULT 0
);
```

There are currently no Alembic migration files. Although Alembic is listed in
`backend/requirements.txt`, schema creation is handled directly in
`backend/db/models.py`.

## Development Workflow

### Backend

```bash
source .venv/bin/activate
uvicorn backend.api.main:app --reload --host 0.0.0.0 --port 8000
```

Useful backend paths:

- API entrypoint: `backend/api/main.py`
- Routes: `backend/api/routes/`
- Settings: `backend/core/config.py`
- Ingestion pipeline: `backend/ingestion/pipeline.py`
- Retrieval pipeline: `backend/retrieval/hybrid.py`
- Generation chain: `backend/generation/chain.py`

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run build
npm run preview
```

`frontend/package.json` also defines `npm run lint`, but the repository does
not currently include ESLint dependencies or an ESLint configuration.

### Tests

No automated test suite is currently checked in. `pytest` and `pytest-asyncio`
are listed in backend requirements, but there is no `tests/` directory or
pytest configuration yet.

## Docker

Build and run the full application stack:

```bash
docker compose up -d --build
```

View service status:

```bash
docker compose ps
```

View backend logs:

```bash
docker compose logs -f backend
```

The backend image is built from `backend/Dockerfile`. It installs Python
dependencies, copies the backend package into `/app/backend`, creates
`/app/bm25_cache`, and runs:

```bash
uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --workers 1
```
