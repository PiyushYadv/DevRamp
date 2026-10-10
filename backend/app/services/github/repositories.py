from sqlalchemy.orm import Session
from app.exceptions.github import GitHubNotConnectedError
from app.models.user import User
from app.repositories.access_repository import AccessRepository
from app.repositories.repository_repository import RepositoryRepository
from app.services.github.client import GitHubClient
from app.utils.encryption import decrypt_secret


class GitHubRepositoryService:
    def __init__(self, db: Session):
        self.access = AccessRepository(db)
        self.repos = RepositoryRepository(db)

    def list_for_user(self, user: User) -> list[dict]:
        """The user's GitHub repositories annotated with DevRamp state (indexed / selected / repoId)."""
        token = decrypt_secret(user.github_access_token) if user.github_access_token else None
        if not token:
            raise GitHubNotConnectedError()

        with GitHubClient(token) as github:
            github_repos = github.list_repositories()

        known = {r.full_name: r for r in self.repos.list_by_full_names([g.full_name for g in github_repos])}
        selected = self.access.get_github_selection(user.id)
        result = []
        for g in github_repos:
            local = known.get(g.full_name.lower())
            result.append({
                "id": g.id,
                "name": g.name,
                "full_name": g.full_name,
                "url": g.html_url,
                "private": g.private,
                "default_branch": g.default_branch,
                "language": g.language,
                "description": g.description,
                "stars": g.stars,
                "updated": g.pushed_at,
                "indexed": bool(local and local.indexed),
                "selected": g.id in selected,
                "repo_id": local.id if local else None,
            })
        return result

    def set_access(self, user: User, github_repo_ids: list[str]) -> list[str]:
        if not user.github_access_token:
            raise GitHubNotConnectedError()
        self.access.set_github_selection(user.id, github_repo_ids)
        return sorted(self.access.get_github_selection(user.id))
