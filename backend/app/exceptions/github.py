from app.utils.errors import AppError


class GitHubNotConfiguredError(AppError):
    status_code = 503
    code = "GITHUB_NOT_CONFIGURED"
    detail = "GitHub sign-in is not configured on this server"


class GitHubOAuthError(AppError):
    status_code = 400
    code = "GITHUB_OAUTH_FAILED"
    detail = "GitHub authorization failed. Please try again."


class GitHubAPIError(AppError):
    status_code = 502
    code = "GITHUB_API_ERROR"
    detail = "GitHub request failed"


class GitHubRateLimitError(AppError):
    status_code = 503
    code = "GITHUB_RATE_LIMITED"
    detail = "GitHub rate limit reached. Connect GitHub or try again later."


class GitHubNotConnectedError(AppError):
    status_code = 400
    code = "GITHUB_NOT_CONNECTED"
    detail = "Connect your GitHub account first"


class GitHubAccountAlreadyLinkedError(AppError):
    status_code = 409
    code = "GITHUB_ACCOUNT_LINKED"
    detail = "This GitHub account is already linked to another DevRamp user"


class GitHubEmailRegisteredError(AppError):
    status_code = 409
    code = "EMAIL_REGISTERED_WITH_PASSWORD"
    detail = "An account with this email exists. Sign in with your password, then connect GitHub from the dashboard."
