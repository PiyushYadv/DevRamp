from fastapi import APIRouter
from app.dependencies import AccessibleRepository
from app.schemas.analysis import ChecklistItem, OnboardingModule
from app.services.analysis.service import AnalysisService

router = APIRouter(tags=["onboarding"])


@router.get("/repository/{repo_id}/modules", response_model=list[OnboardingModule])
def get_modules(repo: AccessibleRepository):
    return AnalysisService().modules(repo)


@router.get("/repository/{repo_id}/checklist", response_model=dict[int, list[ChecklistItem]])
def get_checklist(repo: AccessibleRepository):
    """Default checklist per onboarding module, keyed by module number."""
    return AnalysisService().checklist(repo)
