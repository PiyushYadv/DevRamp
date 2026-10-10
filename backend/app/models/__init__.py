# Import every model so SQLAlchemy registers its table (and string relationships resolve)
# before Base.metadata.create_all runs.
from app.models.user import User
from app.models.repository import Repository
from app.models.repository_access import GitHubRepositorySelection, UserRepositoryAccess
from app.models.chat import ChatMessage

__all__ = ["User", "Repository", "UserRepositoryAccess", "GitHubRepositorySelection", "ChatMessage"]
