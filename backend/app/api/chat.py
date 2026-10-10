from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.dependencies import AccessibleRepository, CurrentUser, DbSession, get_user_repository
from app.schemas.chat import ChatMessageResponse, ChatStreamRequest
from app.services.chat import service as chat_service

router = APIRouter(tags=["chat"])


@router.post("/chat/stream")
def stream_chat(payload: ChatStreamRequest, user: CurrentUser, db: DbSession):
    """
    RAG answer streamed as Server-Sent Events (`token`, `citation`, `done`, `error`). Access and indexing are
    checked before streaming starts so those failures are normal JSON errors.
    """
    repo = chat_service.snapshot_for_chat(get_user_repository(payload.repoId, user, db))
    events = chat_service.build_streamer().stream(user.id, repo, payload.query, payload.context)
    return StreamingResponse(
        events,
        media_type="text/event-stream",
        # Disable proxy buffering so tokens reach the browser as they are generated
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/repository/{repo_id}/chat/history", response_model=list[ChatMessageResponse])
def chat_history(repo: AccessibleRepository, user: CurrentUser, db: DbSession):
    return chat_service.chat_history(db, user.id, repo)
