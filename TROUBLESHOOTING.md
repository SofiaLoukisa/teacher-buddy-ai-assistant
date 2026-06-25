# Troubleshooting

This project runs as multiple services (frontend, Flask API, PostgreSQL, Ollama). Most issues are caused by Docker startup order, missing Ollama model, or auth tokens.

## Common issues

### Docker volume error (Ollama)

If Docker complains that the `ollama` volume is missing (it is declared as an external volume), create it once:

```bash
docker volume create ollama
```

### Services not starting / unhealthy

Check service status:

```bash
cd backend
docker-compose ps
```

View logs:

```bash
cd backend
docker-compose logs api --tail 200
docker-compose logs postgres --tail 200
docker-compose logs ollama --tail 200
```

### Ollama model not found

If chat requests fail and logs mention the model is missing, pull it:

```bash
docker exec -it ollama ollama pull llama3
```

### Port already in use

- Frontend: Vite will auto-pick the next port if `5173` is busy.
- Backend/API: stop the process using `5001` or change the port mapping in `backend/docker-compose.yml`.

### 401 Unauthorized

If requests start returning 401s, your JWT token may be expired. Log out and log in again.

### 422 "Subject must be a string"

Flask-JWT-Extended requires the JWT `sub` (subject) claim to be a string.

- Token creation uses `create_access_token(identity=str(user.id))`
- Token reading converts back with `int(get_jwt_identity())`

If you’re seeing this error, ensure you are running the latest backend container:

```bash
cd backend
docker-compose up -d --build api
```

### Frontend cannot reach API

Confirm the API is reachable:

```bash
curl http://localhost:5000/api/health
```

If needed, confirm the frontend base URL in `frontend/src/services/api.ts` (defaults to `http://localhost:5001`).

## Resetting locally

Stop services:

```bash
cd backend
docker-compose down
```

If you need a clean database, use the provided reset scripts in `backend/` (PowerShell or .bat).
