import httpx
import pytest
from app.ai import http as ai_http
from app.ai import llm as llm_module
from app.ai.llm import ChatTurn, GeminiChatClient, LLMError, LLMRateLimitError


def sse_body(*texts):
    return "".join(
        'data: {"candidates":[{"content":{"parts":[{"text":"%s"}]}}]}\r\n\r\n' % t for t in texts
    ).encode()


@pytest.fixture
def gemini(monkeypatch):
    responses = []
    requests = []

    def handler(request):
        requests.append(request)
        status, body = responses.pop(0)
        return httpx.Response(status, content=body)

    client = httpx.AsyncClient(base_url="https://gemini.test", transport=httpx.MockTransport(handler))
    monkeypatch.setattr(ai_http, "_client", client)
    monkeypatch.setattr(llm_module, "RETRY_BACKOFF_SECONDS", 0)
    return responses, requests


async def collect(client):
    return [d async for d in client.stream("system", [ChatTurn("user", "hi")])]


async def test_streams_text_and_skips_thought_parts(gemini):
    responses, requests = gemini
    thought = b'data: {"candidates":[{"content":{"parts":[{"text":"hmm","thought":true}]}}]}\r\n\r\n'
    responses.append((200, thought + sse_body("Hello", " world")))

    assert await collect(GeminiChatClient(api_key="k")) == ["Hello", " world"]
    assert requests[0].headers["x-goog-api-key"] == "k"
    assert "key=" not in str(requests[0].url)


async def test_retries_503_before_first_token(gemini):
    responses, requests = gemini
    responses.extend([(503, b"overloaded"), (200, sse_body("ok"))])

    client = GeminiChatClient(api_key="k", model="primary", fallback_model="backup")
    assert await collect(client) == ["ok"]
    assert [r.url.path for r in requests] == ["/models/primary:streamGenerateContent", "/models/backup:streamGenerateContent"]


async def test_gives_up_after_max_attempts(gemini):
    responses, _ = gemini
    responses.extend([(503, b"x")] * 3)

    with pytest.raises(LLMError, match="temporarily overloaded"):
        await collect(GeminiChatClient(api_key="k"))


async def test_rate_limit_is_not_retried_and_reports_delay(gemini):
    responses, requests = gemini
    responses.append((429, b'{"error":{"details":[{"retryDelay":"17s"}]}}'))

    with pytest.raises(LLMRateLimitError, match="17s"):
        await collect(GeminiChatClient(api_key="k"))
    assert len(requests) == 1


async def test_stalled_primary_fails_over_quickly(gemini, monkeypatch):
    seen = []

    def handler(request):
        seen.append((request.url.path, request.extensions["timeout"]["read"]))
        if len(seen) == 1:
            raise httpx.ReadTimeout("no first byte", request=request)
        return httpx.Response(200, content=sse_body("ok"))

    client = httpx.AsyncClient(base_url="https://gemini.test", transport=httpx.MockTransport(handler), timeout=60.0)
    monkeypatch.setattr(ai_http, "_client", client)

    assert await collect(GeminiChatClient(api_key="k", model="primary", fallback_model="backup")) == ["ok"]
    assert seen == [
        ("/models/primary:streamGenerateContent", llm_module.PRIMARY_READ_TIMEOUT_SECONDS),
        ("/models/backup:streamGenerateContent", 60.0),
    ]
