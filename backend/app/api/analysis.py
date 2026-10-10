from fastapi import APIRouter
from app.dependencies import AccessibleRepository
from app.schemas.analysis import ArchitectureResponse, DependencyModule, SetupResponse
from app.services.analysis.service import AnalysisService

router = APIRouter(tags=["analysis"])


@router.get("/repository/{repo_id}/architecture", response_model=ArchitectureResponse)
def get_architecture(repo: AccessibleRepository):
    """Stack summary, service topology and Mermaid flowchart derived from the repository's manifests."""
    return AnalysisService().architecture(repo)


@router.get("/repository/{repo_id}/dependencies", response_model=list[DependencyModule])
def get_dependencies(repo: AccessibleRepository):
    """Internal module graph built from import statements."""
    return AnalysisService().dependencies(repo)


@router.get("/repository/{repo_id}/setup", response_model=SetupResponse)
def get_setup(repo: AccessibleRepository):
    return AnalysisService().setup(repo)
