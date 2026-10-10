from app.utils.errors import AppError


class RepositoryNotIndexedError(AppError):
    status_code = 409
    code = "REPOSITORY_NOT_INDEXED"
    detail = "Repository indexing hasn't finished yet"
