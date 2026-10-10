import asyncio
import json
import re
from collections.abc import AsyncIterator
from dataclasses import dataclass
import httpx
from app.ai.http import gemini_http_client
from app.config import settings


MAX_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = 1.0


class LLMError(RuntimeError):
    code = "CHAT_STREAM_FAILED"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class LLMRateLimitError(LLMError):
    code = "CHAT_RATE_LIMITED"


class LLMTransientError(LLMError):
    """5xx from Gemini: the model is temporarily overloaded."""


@dataclass
class ChatTurn:
    role: str  # "user" | "model"
    text: str


class GeminiChatClient:
    """Streams text deltas from Gemini's streamGenerateContent SSE endpoint."""

    def __init__(
        self,
        api_key: str = settings.GEMINI_API_KEY,
        model: str = settings.GEMINI_CHAT_MODEL,
        thinking_level: str = settings.GEMINI_THINKING_LEVEL,
        fallback_model: str | None = settings.GEMINI_FALLBACK_CHAT_MODEL,
    ):
        self.api_key = api_key
        self.model = model
        self.thinking_level = thinking_level
        self.fallback_model = fallback_model or model

    async def stream(self, system_instruction: str, turns: list[ChatTurn], max_output_tokens: int = 2048) -> AsyncIterator[str]:
        body = {
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "contents": [{"role": t.role, "parts": [{"text": t.text}]} for t in turns],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": max_output_tokens,
                # Thinking tokens count against maxOutputTokens and delay the first visible token
                "thinkingConfig": {"thinkingLevel": self.thinking_level},
            },
        }
        yielded = False
        for attempt in range(MAX_ATTEMPTS):
            model = self.model if attempt == 0 else self.fallback_model
            url = f"/models/{model}:streamGenerateContent"
            try:
                async with gemini_http_client().stream(
                    "POST", url, params={"alt": "sse"}, json=body, headers={"x-goog-api-key": self.api_key},
                ) as response:
                    if response.status_code != 200:
                        raise _error_for(response.status_code, (await response.aread()).decode(errors="replace"))
                    async for line in response.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        data = json.loads(line[5:].strip())
                        candidate = (data.get("candidates") or [{}])[0]
                        for part in candidate.get("content", {}).get("parts", []):
                            if part.get("text") and not part.get("thought"):
                                yielded = True
                                yield part["text"]
                        if candidate.get("finishReason") in ("SAFETY", "RECITATION", "PROHIBITED_CONTENT"):
                            raise LLMError("The model stopped responding to this request. Try rephrasing the question.")
                return
            except (LLMTransientError, httpx.HTTPError) as e:
                # Retry overloads (503s are common on the free tier) only before any text reached the client;
                # after that a retry would duplicate the streamed answer
                if yielded or attempt == MAX_ATTEMPTS - 1:
                    if isinstance(e, LLMError):
                        raise
                    raise LLMError("Could not reach Gemini. Please try again.") from e
                await asyncio.sleep(RETRY_BACKOFF_SECONDS * (attempt + 1))


def _error_for(status: int, body: str) -> LLMError:
    if status == 429:
        match = re.search(r'"retryDelay":\s*"(\d+)', body)
        wait = f" Try again in {match.group(1)}s." if match else " Try again shortly."
        return LLMRateLimitError("Gemini rate limit reached." + wait)
    if status >= 500:
        return LLMTransientError("Gemini is temporarily overloaded. Please try again.")
    return LLMError(f"Gemini request failed ({status}).")
