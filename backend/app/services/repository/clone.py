import tempfile
import os
from git import Repo
from git.exc import GitCommandError

class RepositoryCloner:
    def clone_to_temp(self, url: str) -> tempfile.TemporaryDirectory:
        """
        Clones a repository into a temporary directory that automatically 
        cleans itself up when the object goes out of scope or is closed.
        """
        temp_dir = tempfile.TemporaryDirectory()
        try:
            # Shallow clone (depth=1) is significantly faster for onboarding ingestion
            Repo.clone_from(url, temp_dir.name, depth=1)
            return temp_dir
        except GitCommandError as e:
            temp_dir.cleanup()
            raise ValueError(f"Failed to clone repository: {str(e)}")

    def get_current_commit(self, repo_path: str) -> str:
        repo = Repo(repo_path)
        return repo.head.commit.hexsha