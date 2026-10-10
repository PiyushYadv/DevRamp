import httpx

_client: httpx.AsyncClient | None = None


def gemini_http_client() -> httpx.AsyncClient:
    """Process-wide client so Gemini calls reuse pooled TLS connections instead of a new handshake per request."""
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            base_url="https://generativelanguage.googleapis.com/v1beta",
            timeout=httpx.Timeout(60.0, connect=10.0),
            limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
        )
    return _client


async def close_gemini_http_client() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
