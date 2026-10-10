from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    """Base for domain errors; rendered as {"detail": ..., "code": ...} per the frontend contract."""

    status_code = 500
    code = "INTERNAL_ERROR"
    detail = "Unexpected server error"
    headers: dict[str, str] | None = None

    def __init__(self, detail: str | None = None):
        super().__init__(detail or self.detail)
        if detail:
            self.detail = detail


def _error(status_code: int, detail: str, code: str, headers: dict[str, str] | None = None, **extra) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"detail": detail, "code": code, **extra}, headers=headers)


async def _app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return _error(exc.status_code, exc.detail, exc.code, exc.headers)


async def _http_error_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = {404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED"}.get(exc.status_code, "HTTP_ERROR")
    return _error(exc.status_code, str(exc.detail), code, getattr(exc, "headers", None))


async def _validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    errors = exc.errors()
    first = errors[0] if errors else {}
    field = ".".join(str(part) for part in first.get("loc", ())[1:])  # drop "body"/"query" prefix
    message = first.get("msg", "Invalid request")
    detail = f"{field}: {message}" if field else message
    return _error(422, detail, "VALIDATION_ERROR", errors=[
        {"field": ".".join(str(p) for p in e.get("loc", ())[1:]), "message": e.get("msg", "")} for e in errors
    ])


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _app_error_handler)
    app.add_exception_handler(StarletteHTTPException, _http_error_handler)
    app.add_exception_handler(RequestValidationError, _validation_error_handler)
