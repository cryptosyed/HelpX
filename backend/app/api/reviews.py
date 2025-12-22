from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.api.deps import get_db
from app.models import Review, Service, User

router = APIRouter()


@router.get("/services/{service_id}/reviews")
def list_service_reviews(service_id: int, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    reviews = (
        db.query(Review, User)
        .join(User, Review.user_id == User.id)
        .filter(Review.service_id == service_id)
        .order_by(desc(Review.created_at))
        .all()
    )

    result = []
    for review, user in reviews:
        result.append(
            {
                "rating": review.rating,
                "comment": review.comment,
                "created_at": review.created_at,
                "reviewer_name": user.name or user.email,
            }
        )

    return result


