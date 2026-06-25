# Database schema (PostgreSQL)

The database schema is created automatically on startup by SQLAlchemy (`db.create_all()` in `backend/api/app.py`).

## Entity relationships

- Users (1) -> ChatSessions (*) -> Messages (*)
- Users (1) -> ResourceFiles (*)
- Users (1) -> LessonPlans (*)
- Users (1) -> Notes (*)
- Users (1) -> CalendarEvents (*)
- Users (1) -> CalendarClasses (*)
- Users (1) -> Assignments (*)

## Tables and columns

### users

- id (int, PK)
- username (string, unique, required)
- email (string, unique, required)
- password_hash (string, required)
- is_admin (bool, default false)
- created_at (datetime)
- grade_level (string, default "")
- curriculum (string, default "")
- class_size (string, default "")
- teaching_style (string, default "")

### chat_sessions

- id (int, PK)
- user_id (int, FK -> users.id, required)
- title (string, default "New Chat")
- created_at (datetime)

### messages

- id (int, PK)
- session_id (int, FK -> chat_sessions.id, required)
- role (string, required; "user" or "assistant")
- content (text, required)
- created_at (datetime)

### resource_files

- id (int, PK)
- user_id (int, FK -> users.id, required)
- filename (string, required)
- filetype (string, required)
- content (text, required)
- created_at (datetime)

### lesson_plans

- id (int, PK)
- user_id (int, FK -> users.id, required)
- title (string, required)
- instructions (text, required)
- resource_file_id (int, FK -> resource_files.id, optional)
- created_at (datetime)
- updated_at (datetime)

### notes

- id (int, PK)
- user_id (int, FK -> users.id, required)
- title (string, required)
- content (text, required)
- created_at (datetime)
- updated_at (datetime)

### calendar_events

- id (int, PK)
- user_id (int, FK -> users.id, required)
- date (string(10), required; YYYY-MM-DD)
- title (string, required)
- created_at (datetime)

### calendar_classes

- id (int, PK)
- user_id (int, FK -> users.id, required)
- name (string, required)
- date (string(10), required; YYYY-MM-DD)
- time_from (string(5), required; HH:MM)
- time_to (string(5), required; HH:MM)
- room (string, optional)
- created_at (datetime)

### assignments

- id (int, PK)
- user_id (int, FK -> users.id, required)
- title (string, required)
- due_date (string(10), required; YYYY-MM-DD)
- class_name (string, optional)
- created_at (datetime)

## Notes on deletes

The ORM defines cascade deletes for chat sessions/messages and user-owned records (configured via SQLAlchemy relationships). Practically: deleting a user will remove their sessions, messages, and uploaded resources.
