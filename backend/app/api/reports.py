from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import schemas
from app.api.deps import get_current_user, get_db
from app.models import Report, User

router = APIRouter()


@router.post("/", response_model=schemas.ReportOut, status_code=status.HTTP_201_CREATED)
def create_report(
    payload: schemas.ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.report_type not in {"service", "user", "provider", "booking"}:
        raise HTTPException(status_code=400, detail="Invalid report_type")

    report = Report(
        reporter_id=current_user.id,
        report_type=payload.report_type,
        target_type=payload.target_type or payload.report_type,
        target_id=payload.target_id,
        reason=payload.reason,
        status="open",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report

