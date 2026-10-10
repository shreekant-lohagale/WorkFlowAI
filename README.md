# WorkFlowAI

AI-powered workplace productivity system built with React, Vite, Tailwind CSS,
FastAPI, and Groq.

## Backend Setup

Create and activate a virtual environment:

```powershell
python -m venv .venv
```

Install the pinned backend dependencies:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

Copy `.env.example` to `.env`, then replace the Groq placeholder with your own API key. Never commit `.env`.

Start the backend for local development:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000
```

The API runs at `http://localhost:8000`. Interactive API documentation is available at `http://localhost:8000/docs`.

For a production process, use:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Platforms that provide a `PORT` environment variable can pass that value to Uvicorn in their process configuration. No cloud-specific port is hardcoded in the application.

## Frontend Development

Start the frontend in another terminal:

```powershell
cd frontend
npm run dev
```

The frontend runs at `http://localhost:5173` and the API runs at
`http://localhost:8000`.

Set `VITE_API_BASE_URL` in `frontend/.env.local` when the API is hosted at a different origin. Never place `GROQ_API_KEY` in a frontend environment file.

## Environment Configuration

- `GROQ_API_KEY`: required secret used only by the backend.
- `GROQ_MODEL`: optional Groq model override; defaults to `openai/gpt-oss-20b`.
- `ENVIRONMENT`: deployment label; defaults to `development`.
- `ALLOWED_ORIGINS`: comma-separated explicit frontend origins; defaults to `http://localhost:5173`.
- `CHROMA_PATH`: Chroma persistence directory; defaults to `backend/storage/chroma`.
- `PRODUCTIVITY_CSV_PATH`: productivity CSV location; defaults to `data/productivity.csv`.

Relative storage paths resolve from the project root. Storage locations are controlled only by server environment configuration and are never accepted from API requests.

## Persistent Storage

Company Knowledge and productivity analytics use local persistent storage. ChromaDB and `productivity.csv` require a persistent volume if those records must survive cloud redeployments. On platforms with ephemeral filesystems, WorkFlowAI starts safely with an empty Chroma collection and a header-only productivity CSV, but locally written data may be lost on redeployment.

## Railway Backend Deployment

Deploy the repository root as a backend-only Railway service. The included Railway configuration installs only the Python backend dependencies and starts FastAPI using Railway's assigned port.

- Build command: `pip install -r backend/requirements.txt`
- Start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- Health check: `/api/health`
- Railway volume mount: `/data`

Configure these production variables in Railway:

```env
GROQ_API_KEY=<configured in Railway>
GROQ_MODEL=openai/gpt-oss-20b
ENVIRONMENT=production
ALLOWED_ORIGINS=https://your-frontend-domain.example
CHROMA_PATH=/data/chroma
PRODUCTIVITY_CSV_PATH=/data/productivity.csv
```

Only `/data` is intended for runtime-persistent WorkFlowAI data. Company Knowledge is stored at `/data/chroma`, and productivity analytics are stored at `/data/productivity.csv`. Mount the Railway volume before writing production data. Replace the example CORS origin with the deployed React frontend URL; local development continues to default to `http://localhost:5173`.
