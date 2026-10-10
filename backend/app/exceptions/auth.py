from app.utils.errors import AppError


class NotAuthenticatedError(AppError):
    status_code = 401
    code = "NOT_AUTHENTICATED"
    detail = "Authentication required"
    headers = {"WWW-Authenticate": "Bearer"}


class InvalidTokenError(NotAuthenticatedError):
    code = "INVALID_TOKEN"
    detail = "Invalid or expired token"


class InvalidCredentialsError(AppError):
    status_code = 401
    code = "INVALID_CREDENTIALS"
    detail = "Incorrect email or password"


class EmailAlreadyRegisteredError(AppError):
    status_code = 409
    code = "EMAIL_ALREADY_REGISTERED"
    detail = "An account with this email already exists"
