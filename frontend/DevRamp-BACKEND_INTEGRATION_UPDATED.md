# DevRamp Backend Integration Contract — Updated for UX Prototype

## 0. Purpose

DevRamp is a Codebase Intelligence + Developer Onboarding Portal.

The frontend is already visually designed. Backend work must wire functionality into the existing React/Tailwind UI without changing the visual design, layout classes, spacing, typography, or component styling unless a functional state requires a minimal existing-style state.

The product should behave as a **persistent onboarding workspace for a repository**, not merely as a "chat with GitHub" application.

Core loop:

```text
Connect repository
      ↓
Ingest + analyze repository
      ↓
Generate onboarding plan
      ↓
Show persistent onboarding progress
      ↓
Recommend next task
      ↓
Developer learns / acts / verifies
      ↓
Persist progress
      ↓
Sync repository when upstream changes
```

The backend should therefore treat these as first-class entities:

- User
- Repository
- Repository analysis
- Onboarding module
- Onboarding task/checklist item
- User task progress
- Chat conversation/message
- Chat citation
- Repository sync/index state

---

# 1. Technology Stack

## Frontend

- React
- TypeScript
- Tailwind CSS
- React Query
- React Router

Do not redesign the existing UI.

## Backend

- Python
- FastAPI
- Async APIs where appropriate
- Authentication with JWT or the existing auth strategy
- GitHub OAuth for account-level GitHub access

## AI / Retrieval

- LangChain
- Tree-sitter
- Pinecone (async)
- LLM provider chosen by backend implementation

Tree-sitter should be used to extract useful semantic code chunks such as:

- functions
- classes
- methods
- interfaces/types
- important modules/import blocks where useful

Pinecone metadata must retain repository and source-location information so citations can be produced reliably.

---

# 2. Critical Product Distinction: Two Repository Flows

There are TWO separate repository connection experiences.

## A. Connect GitHub account — middle workspace button

This is GitHub OAuth.

Purpose:

- connect the user's GitHub account to DevRamp
- obtain permission to access repositories belonging to that GitHub account
- allow the user to choose repositories from their accessible GitHub account
- support private repositories when GitHub permissions allow it

This flow is account authorization.

It must NOT be reused for the sidebar public repository URL flow.

Recommended flow:

```text
Connect GitHub
    ↓
GitHub OAuth
    ↓
OAuth callback
    ↓
Link GitHub identity to existing DevRamp user
    ↓
Fetch accessible GitHub repositories
    ↓
RepositoryAccessModal
    ↓
User selects repositories
    ↓
Persist repository access
```

If a user is already logged into DevRamp using email/password, connecting GitHub must link GitHub to that existing account. It must not silently create or switch to another DevRamp account.

## B. Connect Repository — sidebar

This is NOT GitHub OAuth.

Purpose:

> Allow a developer to paste any public GitHub repository URL and onboard it.

Example:

```text
https://github.com/facebook/react
https://github.com/user/project
```

Flow:

```text
Sidebar: Connect Repository
    ↓
PublicRepositoryModal
    ↓
POST /api/ingest
    ↓
Backend validates public GitHub URL
    ↓
Clone / fetch repository
    ↓
Analyze + index
    ↓
Return stable repoId
    ↓
Frontend stores repoId + repo metadata
    ↓
Navigate to /dashboard
    ↓
Workspace opens with onboarding overview
```

The sidebar flow must not require GitHub authentication.

---

# 3. Stable Repository Identity

This is critical.

Do NOT use `repoName` as the repository identifier.

Frontend display:

```text
repoName = "core-billing-api"
```

Backend identity:

```text
repoId = "repo_123"
```

All repository-specific API calls, React Query keys, chat history, checklist progress, sync state, and Pinecone metadata must use the stable `repoId`.

A repository record should conceptually contain:

```json
{
  "id": "repo_123",
  "owner": "company",
  "name": "core-billing-api",
  "fullName": "company/core-billing-api",
  "url": "https://github.com/company/core-billing-api",
  "defaultBranch": "main",
  "private": false,
  "language": "TypeScript",
  "indexed": true,
  "analysisStatus": "completed",
  "currentCommit": "a83f12c",
  "lastSyncedAt": "2026-09-25T10:00:00Z",
  "lastAnalyzedAt": "2026-09-25T10:05:00Z"
}
```

The frontend may display `name` or `fullName`, but never use those fields as primary IDs.

---

# 4. Frontend State Model

The current UX prototype has these important state concepts:

```text
hasRepo
repoId
repoName
selectedFile
selectedModule
checklists
lastSyncedAt
githubConnected
```

The backend integration should evolve this to:

```ts
interface RepositoryWorkspaceState {
  repoId: string;
  repository: Repository;
  selectedFile: string | null;
  selectedModule: number | null;
  onboardingProgress: OnboardingProgress;
  lastSyncedAt: string | null;
  analysisStatus: "queued" | "processing" | "completed" | "failed";
}
```

`repoName` is presentation state only.

---

# 5. Authentication

## Login

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

## Signup

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

## Auth response

```json
{
  "user": {
    "id": "user_123",
    "name": "Alex Chen",
    "email": "alex@example.com",
    "githubUrl": "https://github.com/alexchen",
    "authProvider": "password"
  },
  "accessToken": "jwt-access-token"
}
```

Frontend sends:

```http
Authorization: Bearer <accessToken>
```

## GitHub account connection

Recommended production design:

```http
GET /api/auth/github/connect
Authorization: Bearer <token>
```

The backend can respond with a GitHub OAuth authorization URL, or the frontend may navigate directly to a backend OAuth route.

Callback example:

```http
GET /api/auth/github/callback?code=...
```

After callback:

- identify the already-authenticated DevRamp user
- exchange GitHub OAuth code for GitHub access token
- store the GitHub identity/token securely server-side
- associate GitHub account with the DevRamp user
- redirect to the dashboard

Never expose GitHub OAuth access tokens to the frontend.

---

# 6. GitHub Repository Access

## List repositories accessible through connected GitHub account

```http
GET /api/github/repositories
Authorization: Bearer <token>
```

Response:

```json
[
  {
    "id": "github_repo_123",
    "name": "core-billing-api",
    "fullName": "company/core-billing-api",
    "url": "https://github.com/company/core-billing-api",
    "private": true,
    "defaultBranch": "main",
    "language": "TypeScript"
  }
]
```

## Persist selected GitHub repositories

```http
POST /api/github/repositories/access
Authorization: Bearer <token>
Content-Type: application/json
```

Request:

```json
{
  "repositoryIds": ["github_repo_123", "github_repo_456"]
}
```

Response:

```json
{
  "repositoryIds": ["github_repo_123", "github_repo_456"]
}
```

This endpoint controls which repositories the DevRamp user has chosen to expose/use inside DevRamp. It is separate from GitHub OAuth authorization itself.

---

# 7. Public Repository Ingestion

## Endpoint

```http
POST /api/ingest
Authorization: Bearer <token>
Content-Type: application/json
```

Request:

```json
{
  "repoUrl": "https://github.com/user/public-repository"
}
```

Authentication here means the user is authenticated to DevRamp, NOT that GitHub OAuth is required.

The backend should:

1. Validate URL is GitHub.
2. Validate repository is public.
3. Resolve owner/name.
4. Clone repository or fetch a temporary working copy.
5. Detect language/framework.
6. Build repository tree.
7. Parse supported source files with Tree-sitter.
8. Extract semantic chunks.
9. Generate embeddings.
10. Upsert vectors to Pinecone.
11. Generate architecture/setup/dependency analysis.
12. Generate onboarding modules/tasks.
13. Persist repository record.
14. Persist analysis status.
15. Return stable repository ID.

Response for synchronous completion:

```json
{
  "repoId": "repo_123",
  "status": "completed",
  "message": "Repository indexed successfully.",
  "repository": {
    "id": "repo_123",
    "name": "public-repository",
    "fullName": "user/public-repository",
    "url": "https://github.com/user/public-repository",
    "currentCommit": "a83f12c"
  }
}
```

For asynchronous ingestion:

```json
{
  "repoId": "repo_123",
  "status": "queued",
  "message": "Repository ingestion started."
}
```

If asynchronous, expose a status endpoint.

```http
GET /api/repository/{repo_id}/ingestion
Authorization: Bearer <token>
```

Response:

```json
{
  "status": "processing",
  "stage": "embedding",
  "progress": 72,
  "message": "Embedding source chunks"
}
```

Statuses:

```text
queued
processing
completed
failed
```

---

# 8. Repository Sync

The frontend's old "Sync Latest Commit" interaction has been changed conceptually to **Sync Repository**.

It should not blindly re-run the entire ingestion process.

## Endpoint

```http
POST /api/repository/{repo_id}/sync
Authorization: Bearer <token>
```

Optional request:

```json
{
  "force": false
}
```

Backend behavior:

```text
Get current remote HEAD
        ↓
Compare with repository.currentCommit
        ↓
No change? → return up_to_date
        ↓
Changed?
        ↓
Fetch diff
        ↓
Re-parse changed files
        ↓
Update Pinecone vectors
        ↓
Re-run affected analysis
        ↓
Determine affected onboarding tasks
        ↓
Update currentCommit / timestamps
```

Response:

```json
{
  "status": "updated",
  "previousCommit": "old123",
  "currentCommit": "new456",
  "changedFiles": 12,
  "affectedTasks": 3,
  "analysisStatus": "completed",
  "lastSyncedAt": "2026-09-25T10:20:00Z"
}
```

If nothing changed:

```json
{
  "status": "up_to_date",
  "currentCommit": "a83f12c",
  "changedFiles": 0,
  "affectedTasks": 0,
  "lastSyncedAt": "2026-09-25T10:20:00Z"
}
```

The UI should be able to tell the user:

- Repository already up to date.
- Repository updated.
- N files changed.
- N onboarding tasks may need review.

---

# 9. Repository Tree

```http
GET /api/repository/{repo_id}/tree
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

Paths must be repository-relative and use `/` separators.

---

# 10. File Content

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

Return 404 if inaccessible or nonexistent.

---

# 11. Current File Context for Chat — IMPORTANT UX FEATURE

When the developer opens a file in the center code panel, the right chat panel should show that file as contextual scope.

This is strongly recommended.

The chat header can conceptually show:

```text
Ask the Codebase                    Current file
                                      src/auth/jwt.ts
```

The user can still ask questions about the entire repository, but the selected file should become a high-priority retrieval context.

Example:

```text
Current context
┌──────────────────────────────┐
│ src/auth/jwt.ts              │
│ Lines 20–48                  │
└──────────────────────────────┘
```

The backend request should include:

```json
{
  "repoId": "repo_123",
  "query": "Why do we refresh this token here?",
  "context": {
    "filePath": "src/auth/jwt.ts",
    "startLine": 20,
    "endLine": 48
  }
}
```

Optional fields:

```json
{
  "selectedSymbol": "refreshAccessToken",
  "selectedText": "...",
  "moduleId": "module_2"
}
```

Retrieval strategy:

1. Retrieve highly relevant chunks from the current file.
2. Retrieve related chunks from the same module/package.
3. Retrieve top repository-wide chunks.
4. Deduplicate.
5. Pass context to the LLM.

Do NOT restrict retrieval exclusively to the current file. The current file is a relevance boost, not a hard filter.

This allows questions such as:

> Why does this function call `UserRepository`?

The answer can use both the current file and the repository implementation of `UserRepository`.

---

# 12. Chat History

```http
GET /api/repository/{repo_id}/chat/history
Authorization: Bearer <token>
```

Response:

```json
[
  {
    "id": "msg_1",
    "role": "assistant",
    "content": "I've indexed the repository. Ask me anything about the codebase.",
    "citations": [],
    "context": null,
    "createdAt": "2026-09-25T10:00:00Z"
  },
  {
    "id": "msg_2",
    "role": "user",
    "content": "How does authentication work?",
    "citations": [],
    "context": {
      "filePath": "src/auth/jwt.ts"
    },
    "createdAt": "2026-09-25T10:05:00Z"
  }
]
```

Chat history belongs to the user + repository.

---

# 13. Streaming Chat

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
  "query": "How does authentication work?",
  "context": {
    "filePath": "src/auth/jwt.ts",
    "startLine": 20,
    "endLine": 48
  }
}
```

Backend should:

1. Authenticate user.
2. Verify repository access.
3. Load current file context if provided.
4. Query Pinecone for top relevant code chunks.
5. Boost/merge current-file chunks.
6. Include repository metadata and architecture context when useful.
7. Stream LLM output over SSE.
8. Emit structured citations.
9. Persist final user/assistant messages after completion.

Recommended SSE:

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

Prefer structured citation events over requiring the frontend to parse citations out of model text.

---

# 14. Citation Contract

Citation object:

```json
{
  "file": "src/auth/jwt.py",
  "line": 42,
  "endLine": 48,
  "label": "src/auth/jwt.py:L42-L48"
}
```

The frontend should render citations as clickable `CitationChip` components.

Clicking a citation should:

1. Open the referenced file in the center code panel.
2. Select/scroll to the cited line range.
3. Preserve the chat conversation.

This means citations are navigation actions, not decorative labels.

If the LLM emits textual citations, support the pattern:

```regex
\[([^:\]]+):L(\d+)(?:-L(\d+))?\]
```

But structured SSE citation events are preferred.

---

# 15. Onboarding Modules

```http
GET /api/repository/{repo_id}/modules
Authorization: Bearer <token>
```

Response:

```json
[
  {
    "id": "module_architecture",
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

The backend owns onboarding CONTENT, while frontend owns presentation/styling.

---

# 16. Persistent Onboarding Tasks

This is a core product feature, not temporary UI state.

Tasks must persist per:

```text
userId + repositoryId + taskId
```

Recommended task model:

```json
{
  "id": "task_config_env",
  "moduleId": "module_setup",
  "title": "Configure environment variables",
  "description": "Create the required .env values.",
  "type": "action",
  "order": 2,
  "status": "pending",
  "completedAt": null,
  "verifiedAt": null,
  "verification": null
}
```

Task types:

```text
learn
action
verify
```

### learn

Developer reads/explores something and can manually complete it.

### action

Developer performs an action such as configuring environment variables or running migrations.

### verify

DevRamp can programmatically verify completion where possible.

Examples:

```text
learn:
Understand authentication flow

action:
Configure .env

verify:
Health endpoint returns HTTP 200
```

---

# 17. Checklist API

## Get onboarding tasks

```http
GET /api/repository/{repo_id}/checklist
Authorization: Bearer <token>
```

Recommended response:

```json
{
  "modules": [
    {
      "moduleId": "module_setup",
      "items": [
        {
          "id": "task_clone",
          "title": "Clone the repository",
          "label": "Clone the repository",
          "description": "Get the project running locally.",
          "type": "action",
          "done": true,
          "status": "completed",
          "completedAt": "2026-09-25T10:00:00Z",
          "verifiedAt": null
        }
      ]
    }
  ],
  "progress": {
    "completed": 7,
    "total": 11,
    "percentage": 64
  }
}
```

The frontend can adapt this into its current `Record<number, CheckItem[]>` structure during migration.

## Update task

```http
PATCH /api/repository/{repo_id}/checklist/{module_id}/{item_id}
Authorization: Bearer <token>
Content-Type: application/json
```

Request:

```json
{
  "done": true
}
```

Response:

```json
{
  "id": "task_config_env",
  "status": "completed",
  "done": true,
  "completedAt": "2026-09-25T10:30:00Z",
  "verifiedAt": null
}
```

## Complete entire module

Optional:

```http
POST /api/repository/{repo_id}/modules/{module_id}/complete
```

This should only mark manually-completable tasks complete. It must not falsely mark `verify` tasks as verified.

## Reset module

```http
POST /api/repository/{repo_id}/modules/{module_id}/reset
```

---

# 18. Next Recommended Task

The backend should eventually calculate the next useful onboarding task.

```http
GET /api/repository/{repo_id}/onboarding/next
Authorization: Bearer <token>
```

Response:

```json
{
  "task": {
    "id": "task_run_server",
    "moduleId": "module_setup",
    "title": "Run the development server",
    "description": "Start the API locally and verify that it boots.",
    "type": "action",
    "estimatedMinutes": 5
  },
  "reason": "Prerequisite tasks are complete."
}
```

The next-task system should respect task dependencies.

Example:

```text
Clone repository
      ↓
Install dependencies
      ↓
Configure .env
      ↓
Start database
      ↓
Run migrations
      ↓
Start server
      ↓
Verify health endpoint
```

Do not recommend tasks whose prerequisites are incomplete.

---

# 19. Task Verification

For tasks that can be checked automatically, expose:

```http
POST /api/repository/{repo_id}/tasks/{task_id}/verify
Authorization: Bearer <token>
```

Response:

```json
{
  "taskId": "task_health_endpoint",
  "status": "verified",
  "verifiedAt": "2026-09-25T10:40:00Z",
  "message": "Health endpoint returned HTTP 200."
}
```

Verification should never claim success without an actual check.

---

# 20. Repository Analysis

The original frontend contract had separate architecture/dependencies/setup endpoints. Keep those boundaries, but analysis should happen as part of ingestion and be refreshable after sync.

## Architecture

```http
GET /api/repository/{repo_id}/architecture
Authorization: Bearer <token>
```

Response should support both a semantic representation and Mermaid syntax:

```json
{
  "tags": ["FastAPI", "PostgreSQL", "Redis"],
  "summary": "...",
  "connections": ["API -> Service", "Service -> PostgreSQL"],
  "mermaid": "flowchart TD\\n  API --> Service\\n  Service --> DB",
  "nodes": [
    {
      "id": "api",
      "label": "FastAPI",
      "sub": "HTTP API"
    }
  ]
}
```

The frontend may use `nodes` for its existing visual UI while the Mermaid string remains available for richer rendering or future consumers.

Do not make the backend send Tailwind classes.

## Dependencies

```http
GET /api/repository/{repo_id}/dependencies
Authorization: Bearer <token>
```

Semantic response:

```json
[
  {
    "name": "auth",
    "deps": ["config", "database"]
  }
]
```

Frontend controls styling.

## Setup

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
      "required": true,
      "description": "PostgreSQL connection string",
      "example": "postgresql://localhost:5432/app"
    }
  ],
  "prerequisites": [
    {
      "name": "Node.js",
      "version": ">=20",
      "available": null
    }
  ],
  "quickStart": [
    {
      "command": "npm install",
      "comment": "Install dependencies"
    }
  ]
}
```

Do not store secret values in repository analysis responses.

---

# 21. Pinecone Indexing

Each vector should include metadata sufficient for retrieval and citation.

Recommended metadata:

```json
{
  "userId": "user_123",
  "repoId": "repo_123",
  "commitSha": "a83f12c",
  "path": "src/auth/jwt.ts",
  "language": "typescript",
  "nodeType": "function",
  "symbol": "refreshAccessToken",
  "startLine": 20,
  "endLine": 48,
  "contentHash": "..."
}
```

Use `repoId` as the primary isolation key.

Never allow a chat request to retrieve vectors from another repository belonging to the same user.

If practical, use Pinecone namespaces such as:

```text
repo_{repoId}
```

or equivalent metadata filtering.

---

# 22. Tree-sitter Chunking

Parse supported languages into semantic chunks.

At minimum support:

- Python
- TypeScript
- JavaScript

Extract:

- classes
- functions
- methods
- interfaces/types where available
- module/import context

Each chunk should retain:

```text
repoId
path
startLine
endLine
symbol
nodeType
language
commitSha
content
```

Avoid arbitrary fixed-size chunks when a semantic AST node is available.

For very large functions/classes, split them while preserving parent symbol metadata.

---

# 23. File-Aware Chat Retrieval

For a query with current file context:

```json
{
  "repoId": "repo_123",
  "query": "Why is Redis used here?",
  "context": {
    "filePath": "src/auth/session.ts",
    "startLine": 10,
    "endLine": 40
  }
}
```

Recommended retrieval weighting:

```text
Current file exact/semantic matches       highest priority
Same package/module                        high priority
Related symbols/imports                   high priority
Repository-wide top-k                      normal priority
```

The current file must not become the only search scope.

If a user asks:

> What calls this function?

The system should retrieve references from other files even though the current file is the primary context.

---

# 24. Chat Context UI Contract

When a file is selected in the code panel, the frontend should send its path automatically on the next chat request.

The chat header should communicate the active context to the user.

Possible state:

```ts
interface ChatContext {
  repoId: string;
  filePath?: string;
  startLine?: number;
  endLine?: number;
  moduleId?: string;
  selectedSymbol?: string;
}
```

The user should be able to clear the file context if desired.

Recommended UI concept:

```text
Ask the Codebase                 [src/auth/jwt.ts ×]
```

The `×` clears the file context while leaving repository-wide chat active.

---

# 25. Citation Navigation

When a citation is clicked:

```text
Chat citation
     ↓
selectedFile = citation.file
     ↓
CodeView opens file
     ↓
scroll/highlight citation line
```

Backend must return repository-relative paths and exact line numbers.

Optional endpoint for symbol-aware citations:

```http
GET /api/repository/{repo_id}/symbol?path=src/auth/jwt.ts&line=42
```

This is optional; exact file + line information is sufficient initially.

---

# 26. Repository Switcher

The repository name dropdown in the sidebar is a real interaction.

It should show repositories available to the current user:

```text
Current repository
✓ company/core-billing-api
  72% onboarding

company/frontend
  18% onboarding

+ Connect repository
```

Endpoint:

```http
GET /api/repositories
Authorization: Bearer <token>
```

Each repository should include onboarding progress summary:

```json
{
  "id": "repo_123",
  "name": "core-billing-api",
  "url": "https://github.com/company/core-billing-api",
  "indexed": true,
  "onboardingProgress": {
    "completed": 8,
    "total": 11,
    "percentage": 73
  },
  "lastSyncedAt": "2026-09-25T10:20:00Z"
}
```

Switching repositories must update the workspace context to the selected `repoId`.

---

# 27. Error Contract

Use:

```json
{
  "detail": "Repository not found",
  "code": "REPOSITORY_NOT_FOUND"
}
```

Recommended status codes:

```text
400 invalid request
401 unauthenticated / expired token
403 insufficient permission
404 resource not found
409 ingestion/sync already running
422 validation error
500 unexpected error
```

Useful domain codes:

```text
REPOSITORY_NOT_FOUND
REPOSITORY_NOT_PUBLIC
REPOSITORY_ACCESS_DENIED
REPOSITORY_INGESTION_FAILED
REPOSITORY_SYNC_IN_PROGRESS
GITHUB_NOT_CONNECTED
GITHUB_OAUTH_FAILED
GITHUB_REPOSITORY_ACCESS_DENIED
FILE_NOT_FOUND
CHAT_RETRIEVAL_FAILED
CHAT_STREAM_FAILED
TASK_NOT_FOUND
TASK_VERIFICATION_FAILED
```

---

# 28. API Summary

## Auth

```text
POST /api/auth/login
POST /api/auth/signup
GET  /api/auth/github/connect
GET  /api/auth/github/callback
```

## GitHub account

```text
GET  /api/github/repositories
POST /api/github/repositories/access
```

## Repository

```text
GET  /api/repositories
POST /api/ingest
GET  /api/repository/{repo_id}/ingestion
POST /api/repository/{repo_id}/sync
GET  /api/repository/{repo_id}/tree
GET  /api/repository/{repo_id}/file
```

## Analysis

```text
GET /api/repository/{repo_id}/architecture
GET /api/repository/{repo_id}/dependencies
GET /api/repository/{repo_id}/setup
GET /api/repository/{repo_id}/modules
```

## Onboarding

```text
GET  /api/repository/{repo_id}/checklist
PATCH /api/repository/{repo_id}/checklist/{module_id}/{item_id}
POST /api/repository/{repo_id}/modules/{module_id}/complete
POST /api/repository/{repo_id}/modules/{module_id}/reset
GET  /api/repository/{repo_id}/onboarding/next
POST /api/repository/{repo_id}/tasks/{task_id}/verify
```

## Chat

```text
GET  /api/repository/{repo_id}/chat/history
POST /api/chat/stream
```

---

# 29. Frontend Integration Rules

The backend implementation must respect these frontend rules:

1. Do not redesign the existing UI.
2. Do not replace Tailwind styling.
3. Do not send Tailwind class names from the backend.
4. Use stable `repoId`, not repository display name, for data ownership.
5. Collections should return `[]`, never `null`.
6. Paths are repository-relative with `/` separators.
7. Timestamps are ISO 8601.
8. Keep backend responses semantic.
9. React Query should be able to use `repoId` as its query key.
10. Repository-specific state must survive browser refresh through backend persistence.
11. Checklist state belongs to `userId + repoId`.
12. Chat history belongs to `userId + repoId`.
13. Current file context is sent with chat when a file is open.
14. Current file context boosts retrieval but does not restrict repository-wide retrieval.
15. Citations must be precise enough to navigate to a file and line.
16. Repository sync must detect whether the remote commit actually changed before re-indexing.
17. GitHub OAuth and public GitHub URL ingestion are separate flows.
18. Never expose GitHub OAuth tokens to the frontend.
19. Backend must verify that the authenticated user has access to every `repoId` requested.
20. Do not claim a task is verified without actually running its verification logic.

---

# 30. Suggested Backend Implementation Order

Build in this order:

### Phase 1 — Repository persistence

Implement:

```text
User
Repository
UserRepositoryAccess
```

Return stable `repoId` from ingestion.

### Phase 2 — Ingestion

Implement:

```text
clone/fetch
repository tree
Tree-sitter parsing
semantic chunks
Pinecone embeddings
```

### Phase 3 — Analysis

Implement:

```text
architecture
setup
dependencies
modules
onboarding tasks
```

### Phase 4 — Persistent onboarding

Implement:

```text
checklist retrieval
checklist mutation
progress calculation
next task
verification
```

### Phase 5 — Chat

Implement:

```text
history
Pinecone retrieval
current-file context
SSE streaming
structured citations
message persistence
```

### Phase 6 — Sync

Implement:

```text
remote HEAD detection
diff detection
incremental indexing
affected analysis
affected onboarding tasks
```

### Phase 7 — GitHub OAuth

Implement:

```text
GitHub account linking
repository permission/access selection
private repository support
```

---

# 31. Product Principle for Backend Decisions

DevRamp is not primarily a repository browser.

It is a **persistent developer onboarding system**.

Repository intelligence exists to help answer:

> "What does this developer need to understand or do next to become productive in this codebase?"

Therefore:

```text
Repository analysis
       ↓
Knowledge
       ↓
Onboarding tasks
       ↓
Developer actions
       ↓
Verification
       ↓
Persistent progress
```

The backend should optimize for this loop rather than simply maximizing the amount of repository information returned to the frontend.
