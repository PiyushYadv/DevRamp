import json
import os
import pytest
from app.ai.llm import LLMRateLimitError
from app.config import settings
from app.models.repository import Repository
from app.models.repository_access import UserRepositoryAccess
from app.models.user import User
from app.services.chat import service as chat_service
from app.services.chat.retrieval import RetrievedChunk
from app.services.chat.streaming import ChatStreamer
from app.services.repository.service import RepositoryFileService


class FakeRetriever:
    def __init__(self):
        self.calls = []

    async def retrieve(self, repo, query, file_path=None, start_line=None, end_line=None):
        self.calls.append((query, file_path, start_line, end_line))
        return [RetrievedChunk("src/auth/jwt.py", 1, 4, "def create_access_token(): ...", "create_access_token", 0.9, "repository")]


class FakeLLM:
    def __init__(self):
        self.deltas = ["Tokens are created in ", "[file:src/auth/jw", "t.py:L3]. See also [file:src/ghost.py:L1]", "."]
        self.error = None
        self.requests = []

    async def stream(self, system, turns, max_output_tokens=2048):
        self.requests.append((system, turns))
        for d in self.deltas:
            yield d
        if self.error:
            raise self.error


@pytest.fixture
def chat_env(monkeypatch, tmp_path, db_session, client):
    monkeypatch.setattr(settings, "REPOS_DIR", str(tmp_path))
    root = tmp_path / "repo_chat"
    (root / "src/auth").mkdir(parents=True)
    (root / "src/auth/jwt.py").write_text("import jwt\n\ndef create_access_token():\n    ...\n")

    retriever, llm = FakeRetriever(), FakeLLM()
    monkeypatch.setattr(chat_service, "build_streamer", lambda: ChatStreamer(retriever, llm, RepositoryFileService()))

    def signup(email):
        body = client.post("/api/auth/signup", json={"name": "Dev", "email": email, "password": "password123"}).json()
        return body["user"]["id"], {"Authorization": f"Bearer {body['accessToken']}"}

    owner_id, headers = signup("dev@example.com")
    db_session.add(Repository(id="repo_chat", owner="octo", name="demo", full_name="octo/demo", url="https://github.com/octo/demo",
                              indexed=True, analysis_status="completed", indexed_paths=["src/auth/jwt.py"], chunk_count=1))
    db_session.add(UserRepositoryAccess(user_id=owner_id, repo_id="repo_chat"))
    db_session.commit()
    return {"headers": headers, "retriever": retriever, "llm": llm, "signup": signup}


def parse_sse(text):
    events = []
    for block in text.strip().split("\n\n"):
        lines = dict(line.split(": ", 1) for line in block.splitlines())
        events.append((lines["event"], json.loads(lines["data"])))
    return events


def ask(client, headers, query="How are tokens created?", context=None, repo_id="repo_chat"):
    body = {"repoId": repo_id, "query": query}
    if context is not None:
        body["context"] = context
    return client.post("/api/chat/stream", json=body, headers=headers)


def test_stream_emits_tokens_citations_and_done(client, chat_env):
    res = ask(client, chat_env["headers"], context={"repoId": "repo_chat", "filePath": "src/auth/jwt.py", "startLine": 3})

    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/event-stream")
    events = parse_sse(res.text)
    assert "".join(e[1]["text"] for e in events if e[0] == "token") == "".join(chat_env["llm"].deltas)
    citations = [e[1] for e in events if e[0] == "citation"]
    assert citations == [{"file": "src/auth/jwt.py", "line": 3, "label": "src/auth/jwt.py:L3"}]  # ghost.py dropped
    assert events[-1][0] == "done" and events[-1][1]["messageId"].startswith("msg_")
    assert chat_env["retriever"].calls == [("How are tokens created?", "src/auth/jwt.py", 3, None)]


def test_exchange_is_persisted_and_used_as_follow_up_history(client, chat_env):
    headers = chat_env["headers"]
    message_id = parse_sse(ask(client, headers, context={"filePath": "src/auth/jwt.py"}).text)[-1][1]["messageId"]

    history = client.get("/api/repository/repo_chat/chat/history", headers=headers).json()
    assert [m["role"] for m in history] == ["user", "assistant"]
    assert history[0]["content"] == "How are tokens created?" and history[0]["context"] == {"filePath": "src/auth/jwt.py"}
    assert history[1]["id"] == message_id
    assert history[1]["citations"] == [{"file": "src/auth/jwt.py", "line": 3, "label": "src/auth/jwt.py:L3", "endLine": None}]

    ask(client, headers, query="And how are they verified?")
    _, turns = chat_env["llm"].requests[-1]
    assert [t.role for t in turns] == ["user", "model", "user"]
    assert turns[0].text == "How are tokens created?"
    assert "And how are they verified?" in turns[-1].text and "<source_excerpts>" in turns[-1].text


def test_llm_error_is_streamed_and_not_persisted(client, chat_env):
    chat_env["llm"].error = LLMRateLimitError("Gemini rate limit reached. Try again in 20s.")
    events = parse_sse(ask(client, chat_env["headers"]).text)

    assert events[-1] == ("error", {"code": "CHAT_RATE_LIMITED", "message": "Gemini rate limit reached. Try again in 20s."})
    assert not any(e[0] == "done" for e in events)
    history = client.get("/api/repository/repo_chat/chat/history", headers=chat_env["headers"]).json()
    assert [m["id"] for m in history] == ["welcome"]


def test_empty_history_returns_welcome_message(client, chat_env):
    history = client.get("/api/repository/repo_chat/chat/history", headers=chat_env["headers"]).json()

    assert len(history) == 1 and history[0]["role"] == "assistant"
    assert "octo/demo" in history[0]["content"]


def test_chat_requires_repository_access(client, chat_env):
    _, stranger = chat_env["signup"]("stranger@example.com")

    res = ask(client, stranger)
    assert res.status_code == 404 and res.json()["code"] == "REPOSITORY_NOT_FOUND"
    assert client.get("/api/repository/repo_chat/chat/history", headers=stranger).status_code == 404
    assert ask(client, {}).status_code == 401


def test_chat_waits_for_indexing(client, chat_env, db_session):
    repo = db_session.get(Repository, "repo_chat")
    repo.indexed, repo.analysis_status, repo.ingestion_progress = False, "processing", 40
    db_session.commit()

    res = ask(client, chat_env["headers"])
    assert res.status_code == 409
    assert res.json()["code"] == "REPOSITORY_NOT_INDEXED" and "40%" in res.json()["detail"]


def test_chat_history_is_per_user(client, chat_env, db_session):
    ask(client, chat_env["headers"])
    other_id, other_headers = chat_env["signup"]("teammate@example.com")
    db_session.add(UserRepositoryAccess(user_id=other_id, repo_id="repo_chat"))
    db_session.commit()

    history = client.get("/api/repository/repo_chat/chat/history", headers=other_headers).json()
    assert [m["id"] for m in history] == ["welcome"]


def test_query_validation(client, chat_env):
    assert ask(client, chat_env["headers"], query="").status_code == 422
    assert ask(client, chat_env["headers"], query="x" * 4001).status_code == 422
