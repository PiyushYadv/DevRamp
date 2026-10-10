from app.utils.errors import AppError


class InvalidRepositoryUrlError(AppError):
    status_code = 400
    code = "INVALID_REPOSITORY_URL"
    detail = "Enter a GitHub repository URL like https://github.com/owner/repo"


class RepositoryNotFoundError(AppError):
    status_code = 404
    code = "REPOSITORY_NOT_FOUND"
    detail = "Repository not found"


class RepositoryNotPublicError(AppError):
    status_code = 403
    code = "REPOSITORY_NOT_PUBLIC"
    detail = "This repository is private. Connect GitHub with repository access to onboard it."


class RepositoryTooLargeError(AppError):
    status_code = 413
    code = "REPOSITORY_TOO_LARGE"
    detail = "Repository is too large to ingest"


class RepositoryIngestionError(AppError):
    status_code = 502
    code = "REPOSITORY_INGESTION_FAILED"
    detail = "Repository ingestion failed"


class RepositoryNotReadyError(AppError):
    status_code = 409
    code = "REPOSITORY_NOT_READY"
    detail = "Repository files are not available yet"


class FileNotFoundInRepositoryError(AppError):
    status_code = 404
    code = "FILE_NOT_FOUND"
    detail = "File not found"


class FileNotTextError(AppError):
    status_code = 415
    code = "FILE_NOT_TEXT"
    detail = "Binary files can't be displayed"


class FileTooLargeError(AppError):
    status_code = 413
    code = "FILE_TOO_LARGE"
    detail = "File is too large to display"
