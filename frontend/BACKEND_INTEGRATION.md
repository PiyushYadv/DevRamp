# DevRamp Frontend Backend Integration Contract

This document describes the API contract expected by the current DevRamp frontend.
The frontend currently uses mock implementations by default. Backend integration should preserve these response shapes so the UI does not need to change.

## 1. Frontend configuration

The frontend reads:

```env
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK_API=false
```

`VITE_USE_MOCK_API=true` uses local mock data. Set it to `false` to use FastAPI.

All API requests are made relative to `VITE_API_URL`.

## 2. Authentication

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

Request:

```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

### Signup

```http
POST /api/auth/signup
Content-Type: application/json
```

Request:

```json
{
  "name": "Alex Chen",
  "email": "alex@example.com",
  "password": "secret"
}
```

### GitHub authentication

The current frontend expects:

```http
POST /api/auth/github
```

For a production OAuth flow, this may instead return a redirect URL or use a browser redirect. If the backend keeps the current contract, return the normal auth response below.

Auth response:

```json
{
  "user": {
    "id": "user_123",
    "name": "Alex Chen",
    "email": "alex@example.com",
    "githubUrl": "https://github.com/alexchen"
  },
  "accessToken": "jwt-access-token"
}
```

The frontend sends the token on future requests:

```http
Authorization: Bearer <accessToken>
```

Expected auth errors should use HTTP `401`.

## 3. Repositories

### List repositories

```http
GET /api/repositories
Authorization: Bearer <token>
```

Response:

```json
[
  {
    "id": "repo_123",
    "name": "company/core-billing-api",
    "url": "https://github.com/company/core-billing-api",
    "language": "TypeScript",
    "indexed": true,
    "private": true,
    "stars": 42,
    "updated": "2026-09-25T10:00:00Z"
  }
]
```

The required backend fields are `id`, `name`, `url`, and `indexed`. The remaining fields are optional presentation metadata.

### Start repository ingestion

```http
POST /api/ingest
Authorization: Bearer <token>
Content-Type: application/json
```

Request:

```json
{
  "repoUrl": "https://github.com/company/core-billing-api"
}
```

Response:

```json
{
  "repoId": "repo_123",
  "status": "queued",
  "message": "Repository ingestion started"
}
```

Valid statuses:

```text
queued | processing | completed | failed
```

The frontend currently waits for this request to resolve before opening the repository workspace. A future polling endpoint can be added if ingestion becomes asynchronous.

## 4. Repository tree and files

### Get repository tree

```http
GET /api/tree?repo_id=repo_123
Authorization: Bearer <token>
```

Response:

```json
[
  {
    "name": "src",
    "path": "src",
    "type": "folder",
    "children": [
      {
        "name": "main.py",
        "path": "src/main.py",
        "type": "file",
        "indexed": true,
        "startLine": 1,
        "endLine": 80,
        "nodeType": "module"
      }
    ]
  }
]
```

Folder `children` may be omitted or returned as an empty array. File paths must be repository-relative and use `/` separators.

### Get file content

```http
GET /api/repository/{repo_id}/file?path=src/main.py
Authorization: Bearer <token>
```

Response:

```json
{
  "path": "src/main.py",
  "lang": "Python",
  "content": "from fastapi import FastAPI\\n...",
  "startLine": 1,
  "endLine": 80
}
```

The frontend uses `content` and `lang` for the code viewer. Return `404` when the file does not exist or is not accessible.

## 5. Architecture, dependencies, and setup

These workspace tabs are currently mock-backed, but the backend should expose the following contracts for the final integration.

### Architecture

```http
GET /api/repository/{repo_id}/architecture
Authorization: Bearer <token>
```

Response:

```json
{
  "tags": ["FastAPI", "PostgreSQL", "Redis"],
  "summary": "Service architecture summary",
  "connections": ["-> HTTP/REST", "-> TCP/5432"]
}
```

### Dependency graph

```http
GET /api/repository/{repo_id}/dependencies
Authorization: Bearer <token>
```

Response:

```json
[
  {
    "name": "auth",
    "deps": ["config", "database"],
    "color": "border-indigo-500/30 bg-indigo-500/5"
  }
]
```

### Setup guide

```http
GET /api/repository/{repo_id}/setup
Authorization: Bearer <token>
```

Response:

```json
{
  "environmentVariables": [
    {
      "key": "DATABASE_URL",
      "value": "postgresql://...",
      "required": true
    }
  ],
  "prerequisites": [
    {
      "name": "Python",
      "version": ">= 3.12",
      "available": true
    }
  ]
}
```

The backend should preferably return semantic data, not Tailwind classes. If colors are needed, the frontend should map known categories to classes.

## 6. Modules and onboarding

Recommended endpoint:

```http
GET /api/repository/{repo_id}/modules
Authorization: Bearer <token>
```

Response:

```json
[
  {
    "n": 1,
    "title": "Architecture Overview",
    "subtitle": "Understand the system topology.",
    "duration": "20 min",
    "sections": [
      {
        "heading": "Technology stack",
        "body": "..."
      }
    ]
  }
]
```

Module styling should remain frontend-owned. The backend should return content only.

### Onboarding checklist state

```http
GET /api/repository/{repo_id}/checklist
Authorization: Bearer <token>
```

Response:

```json
{
  "1": [
    {
      "id": "a1",
      "label": "Read the architecture summary",
      "done": true
    },
    {
      "id": "a2",
      "label": "Review the service topology diagram",
      "done": false
    }
  ],
  "2": [
    {
      "id": "s1",
      "label": "Clone the repository",
      "done": true
    }
  ]
}
```

The object keys are module numbers represented as strings by JSON. Each module maps to an array of checklist items.

Recommended mutation endpoint:

```http
PATCH /api/repository/{repo_id}/checklist/{module_number}/{item_id}
Authorization: Bearer <token>
Content-Type: application/json
```

Request:

```json
{
  "done": true
}
```

The response should return the updated checklist item.

## 7. Chat history

### Get chat history

```http
GET /api/repository/{repo_id}/chat/history
Authorization: Bearer <token>
```

Response:

```json
[
  {
    "id": "assistant-1",
    "role": "assistant",
    "content": "I've indexed the repository. Ask me anything about the architecture.",
    "citations": [],
    "code": null
  },
  {
    "id": "user-1",
    "role": "user",
    "content": "How does authentication work?"
  }
]
```

`role` must be either `user` or `assistant`. `citations` and `code` are optional for each message.

## 8. Streaming chat

### Endpoint

```http
POST /api/chat/stream
Authorization: Bearer <token>
Content-Type: application/json
Accept: text/event-stream
```

Request:

```json
{
  "repoId": "repo_123",
  "query": "How does authentication work?"
}
```

Recommended SSE format:

```text
event: token
data: {"text":"Authentication "}

event: token
data: {"text":"uses JWT..."}

event: citation
data: {"file":"src/auth/jwt.py","line":42,"label":"src/auth/jwt.py:L42"}

event: done
data: {"messageId":"msg_123"}

```

At minimum, support newline-delimited SSE `data:` messages. The final assembled message should map to:

```json
{
  "id": "msg_123",
  "role": "assistant",
  "content": "Authentication uses JWT...",
  "citations": [
    {
      "file": "src/auth/jwt.py",
      "line": 42,
      "label": "src/auth/jwt.py:L42"
    }
  ],
  "code": "optional code block"
}
```

Citation labels should use the format:

```text
[file:path/to/file.py:L42]
```

The backend should keep citations structured in SSE metadata when possible instead of requiring the frontend to parse arbitrary model text.

## 9. Error format

Use a consistent response shape:

```json
{
  "detail": "Repository not found",
  "code": "REPOSITORY_NOT_FOUND"
}
```

Recommended status codes:

```text
400 invalid request
401 unauthenticated or expired token
403 insufficient permission
404 resource not found
409 ingestion already running
422 validation error
500 unexpected server error
```

## 10. Frontend integration notes

- Keep repository IDs stable; the frontend uses them as React Query keys.
- Do not return `null` for collections; return `[]` instead.
- Keep file paths repository-relative.
- Return ISO timestamps for repository metadata.
- Keep backend response field names in camelCase, or configure the frontend client to transform snake_case.
- Avoid sending UI-specific Tailwind class names from the backend.
- Enable CORS for the Vite development origin, normally `http://localhost:5173`.
- Enable credentials only if the chosen authentication strategy requires cookies.
- The frontend currently caches queries for 30 seconds and retries failed queries once.

## 11. Current frontend API files

The backend-facing boundary is located at:

```text
src/lib/api/auth.ts
src/lib/api/client.ts
src/lib/api/config.ts
src/lib/api/ingest.ts
src/lib/api/repository.ts
src/lib/api/chat.ts
src/lib/api/types.ts
```

Feature components should call hooks rather than calling `fetch` directly.
