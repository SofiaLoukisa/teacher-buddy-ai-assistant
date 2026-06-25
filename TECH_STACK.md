# Technology Stack

This document summarizes the technologies used in Teacher Buddy and how they fit together.

## Frontend (React + Vite)

- React 18.3 (react, react-dom)
  - Component-based UI for the dashboard, chat, calendar, and admin pages.
- TypeScript 5.6
  - Type safety across API contracts and state.
- Vite 5 + SWC (via @vitejs/plugin-react-swc)
  - Fast development server and optimized production builds.
- React Router 6.28
  - SPA routing and protected routes.
- Axios 1.13
  - HTTP client used for API calls (with auth header handling).
- Custom CSS
  - Styling and theme variables (light/dark theme via CSS variables).

## Backend API (Flask)

- Flask 3.0
  - REST API and request routing.
- flask-cors 4.0
  - CORS headers so the frontend (Vite dev server) can call the API.
- flask-jwt-extended 4.6
  - JWT authentication for protected endpoints.
- flask-sqlalchemy 3.1 + SQLAlchemy 2.0
  - ORM layer for models and queries.
- psycopg2-binary 2.9
  - PostgreSQL driver.
- requests 2.31
  - HTTP client used for server-to-server calls (e.g., to Ollama).

### Resource ingestion

The API supports uploading classroom resources and extracting text:

- pdfplumber
  - PDF text extraction.
- python-docx
  - Reads .docx files.
- openpyxl
  - Reads .xlsx spreadsheets.

## Database

- PostgreSQL 16 (postgres:16-alpine in Docker)
  - Persists users, chat sessions/messages, resources, lesson plans, notes, and calendar items.

For the exact tables and columns, see DATABASE_SCHEMA.md.

## AI

- Ollama
  - Runs locally and exposes an HTTP API.
- Llama 3 (llama3)
  - Default model configured in docker-compose.yml.

High-level request flow:

1. Frontend sends a request to the Flask API.
2. API optionally reads/writes to PostgreSQL.
3. API calls Ollama to generate the assistant response.
4. API returns JSON back to the frontend.

## Infrastructure and tooling

- Docker + Docker Compose
  - Orchestrates postgres, ollama, and the api (and an optional legacy streamlit service).
- Docker volumes
  - postgres_data: persistent database storage.
  - ollama: persistent model storage (configured as an external volume).
- Windows scripts
  - PowerShell and batch scripts under backend/ for setup/start/stop/reset.

## Security

- JWT auth (flask-jwt-extended)
  - Stateless authentication via `Authorization: Bearer <token>`.
- Password hashing (Werkzeug)
  - Passwords are stored as hashes (PBKDF2), not plain text.

Example REST request:

```http
POST /api/auth/login
Content-Type: application/json

{"username": "admin", "password": "admin123"}
```

## References

- React: <https://react.dev>
- TypeScript: <https://www.typescriptlang.org/docs/>
- Flask: <https://flask.palletsprojects.com/>
- SQLAlchemy: <https://docs.sqlalchemy.org/>
- Docker Compose: <https://docs.docker.com/compose/>
- Ollama: <https://ollama.com>
