import base64
import os
import shutil
from git import Git, Repo
from git.exc import GitCommandError
from app.config import settings


class RepositoryCloner:
    def __init__(self, base_dir: str | None = None):
        self.base_dir = base_dir or settings.REPOS_DIR
        os.makedirs(self.base_dir, exist_ok=True)

    def repo_path(self, repo_id: str) -> str:
        return os.path.join(self.base_dir, repo_id)

    def clone_repo(self, url: str, repo_id: str, access_token: str | None = None) -> str:
        """
        Shallow-clones (depth=1) the repository into base_dir/{repo_id}.
        Clones into a staging directory first so a failed re-clone never destroys the existing copy.
        `access_token` (a user's GitHub OAuth token) enables private repositories.
        """
        if not url.startswith("https://"):
            raise ValueError("Only https:// repository URLs are supported")

        target_path = self.repo_path(repo_id)
        staging_path = f"{target_path}.tmp"
        shutil.rmtree(staging_path, ignore_errors=True)

        try:
            Repo.clone_from(url, staging_path, depth=1, env=_git_env(access_token))
        except GitCommandError as e:
            shutil.rmtree(staging_path, ignore_errors=True)
            # git's stderr includes server filesystem paths, so keep it on the chained exception only
            raise ValueError("Failed to clone repository. Check the URL and that the repository is public.") from e

        shutil.rmtree(target_path, ignore_errors=True)
        os.replace(staging_path, target_path)
        return target_path

    def remote_head(self, url: str, access_token: str | None = None) -> str:
        """Commit SHA of the remote's default branch, without cloning (git ls-remote)."""
        if not url.startswith("https://"):
            raise ValueError("Only https:// repository URLs are supported")
        try:
            output = Git().ls_remote(url, "HEAD", env=_git_env(access_token))
        except GitCommandError as e:
            raise ValueError("Couldn't reach the repository on GitHub.") from e
        sha = output.split()[0] if output.strip() else ""
        if len(sha) != 40:
            raise ValueError("Couldn't read the repository's latest commit.")
        return sha

    def get_repo_metadata(self, repo_path: str) -> dict:
        repo = Repo(repo_path)
        commit_sha = repo.head.commit.hexsha
        # A fresh clone checks out the remote's default branch
        branch = "main" if repo.head.is_detached else repo.active_branch.name
        return {"commit_sha": commit_sha, "default_branch": branch}

    def delete_repo(self, repo_id: str) -> None:
        shutil.rmtree(self.repo_path(repo_id), ignore_errors=True)


def _git_env(access_token: str | None) -> dict[str, str]:
    # GIT_TERMINAL_PROMPT=0: fail fast on private repos instead of hanging on a credential prompt
    env = {"GIT_TERMINAL_PROMPT": "0"}
    if access_token:
        # Config passed via environment applies to this command only: unlike a token in the URL or
        # `clone -c`, it is never written to the cloned repository's .git/config
        basic = base64.b64encode(f"x-access-token:{access_token}".encode()).decode()
        env.update({
            "GIT_CONFIG_COUNT": "1",
            "GIT_CONFIG_KEY_0": "http.https://github.com/.extraheader",
            "GIT_CONFIG_VALUE_0": f"Authorization: Basic {basic}",
        })
    return env
