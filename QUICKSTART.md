# Teacher Buddy - Quickstart

Useful documents:

- [README.md](README.md)
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)

## Start everything

### Step 1 - Start backend services

```bash
cd backend

# Create Docker volumes (first time only)
docker volume create ollama
docker volume create postgres_data

# Start all services
docker-compose up -d --build
```

Wait ~30 seconds for services to start, then check status:

```bash
docker-compose ps
```

### Step 2 - Pull AI model (first time only)

```bash
# This downloads the Llama3 model (~4.7GB, takes 5-15 minutes)
docker exec -it ollama ollama pull llama3
```

Important: you must pull the model before using chat.

### Step 3 - Start frontend

```bash
cd frontend
npm install  # First time only
npm run dev
```

## Access URLs

- App: <http://localhost:5173>
- API: <http://localhost:5001>
- Admin login: `admin` / `admin123`

## Stop everything

```bash
# Frontend: Ctrl+C in terminal

# Backend:
cd backend
docker-compose down
```

## Common commands

### View logs

```bash
cd backend
docker-compose logs api
docker-compose logs postgres
docker-compose logs ollama
```

### Rebuild API (after code changes)

```bash
cd backend
docker-compose up -d --build api
```

### Reset database (deletes data)

```bash
cd backend
.\reset.ps1   # Windows
./reset.sh    # Linux/Mac
```

### Check status

```bash
cd backend
docker-compose ps
```

## Quick fixes

### Port in use

```bash
# Vite auto-switches to 5174 if 5173 is busy
# Or manually:
npm run dev -- --port 5175
```

### Can't connect to API

```bash
# Test API health
curl http://localhost:5000/api/health

# Restart services
cd backend
docker-compose restart api
```

### Model not found

```bash
docker exec -it ollama ollama pull llama3
docker exec -it ollama ollama list
```

### Login issues

```javascript
// Clear browser storage (F12 console)
localStorage.clear()
location.reload()
```

## Key files

Backend:

- `backend/api/app.py` - Flask API (models + endpoints)
- `backend/docker-compose.yml` - Services and ports

Frontend:

- `frontend/src/App.tsx` - Routes + theme toggle
- `frontend/src/pages/ChatPage.tsx` - Teacher dashboard
- `frontend/src/services/api.ts` - Axios client + typed APIs

## API endpoints

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/verify`

Chat (requires auth):

- `GET /api/chat/sessions`
- `GET /api/chat/sessions/:id`
- `POST /api/chat/send`
- `DELETE /api/chat/sessions/:id`

Admin (admin only):

- `GET /api/admin/stats`

Resources (requires auth):

- `GET /api/resources`
- `POST /api/resources/upload`
- `DELETE /api/resources/:id`

Lesson plans (requires auth):

- `GET /api/lesson-plans`
- `POST /api/lesson-plans`
- `DELETE /api/lesson-plans/:id`

Notes (requires auth):

- `GET /api/notes`
- `POST /api/notes`
- `DELETE /api/notes/:id`

Calendar (requires auth):

- `GET /api/calendar/events`
- `POST /api/calendar/events`
- `DELETE /api/calendar/events/:id`
- `GET /api/calendar/classes`
- `POST /api/calendar/classes`
- `DELETE /api/calendar/classes/:id`

Assignments (requires auth):

- `GET /api/assignments`
- `POST /api/assignments`
- `DELETE /api/assignments/:id`

Preferences (requires auth):

- `GET /api/preferences`
- `PUT /api/preferences`

Utility:

- `GET /api/health`

## Architecture

```text
Browser (5173) -> Flask API (5000) -> PostgreSQL (5432)
                      |
                      v
                 Ollama (12434) -> Llama3
```

## Support

- Setup and runtime issues: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Project overview and ports: [README.md](README.md)
