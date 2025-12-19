import logging
import math
import time
from collections import defaultdict
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, text
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import Session

from app import schemas
from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.models import Booking, Provider, Report, Service, User

router = APIRouter()
logger = logging.getLogger(__name__)

# Tunable constants to keep the algorithm deterministic and explainable
DEFAULT_RADIUS_KM = 10.0
DEFAULT_TOP_N = 5
MAX_ALLOWED_BOOKINGS = 20  # used to normalise workload_penalty
ACTIVE_BOOKING_STATUSES = {"pending", "accepted"}
SUPPORTED_ALGORITHMS = {"hybrid", "baseline", "trust_hybrid"}
DOMINATION_CAP = 50  # soft cap for frequency penalty


def _init_stats() -> Dict[str, dict]:
    base = lambda: {
        "count": 0,
        "distance_sum": 0.0,
        "distance_sq_sum": 0.0,
        "active_sum": 0.0,
        "active_sq_sum": 0.0,
        "candidate_count_sum": 0,
        "candidate_sq_sum": 0,
        "provider_freq": defaultdict(int),
    }
    return {algo: base() for algo in SUPPORTED_ALGORITHMS}


MATCH_STATS = _init_stats()


def _validate_location(lat: Optional[float], lon: Optional[float]) -> None:
    if lat is None or lon is None:
        raise HTTPException(
            status_code=400,
            detail="user_lat and user_lon are required for matching",
        )


@router.get(
    "/match/providers",
    response_model=schemas.ProviderMatchResponse,
    summary="Rank providers near a job location",
)
def match_providers(
    service_id: int = Query(..., gt=0),
    user_lat: float = Query(..., description="Latitude of the job/request"),
    user_lon: float = Query(..., description="Longitude of the job/request"),
    radius_km: float = Query(DEFAULT_RADIUS_KM, gt=0, description="Search radius in km"),
    top_n: int = Query(DEFAULT_TOP_N, gt=0, le=50, description="Number of results to return"),
    algorithm: str = Query("trust_hybrid", description="Algorithm to use: trust_hybrid|hybrid|baseline"),
    debug: bool = Query(False, description="Return timing/plan metadata"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Hybrid distance-based matching with multi-constraint filtering.
    Filters on category + provider state at SQL level (PostGIS), then computes
    weighted scores in Python for explainability and deterministic ordering.
    """
    _validate_location(user_lat, user_lon)
    algorithm = algorithm.lower()
    if algorithm not in SUPPORTED_ALGORITHMS:
        raise HTTPException(status_code=400, detail="Unsupported algorithm")

    # Get the seed service to infer category and avoid invalid requests
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    user_point = func.ST_SetSRID(func.ST_MakePoint(user_lon, user_lat), 4326)
    radius_m = radius_km * 1000

    # Workload per provider (active bookings only, future-facing)
    workload_subq = (
        db.query(
            Booking.provider_id.label("provider_id"),
            func.count(Booking.id).label("active_bookings"),
        )
        .filter(
            Booking.status.in_(ACTIVE_BOOKING_STATUSES),
            Booking.scheduled_at >= func.now(),
        )
        .group_by(Booking.provider_id)
        .subquery()
    )

    base_query = (
        db.query(
            Service.id.label("service_id"),
            Service.provider_id.label("provider_id"),
            func.ST_Distance(Service.location, user_point).label("distance_m"),
            Provider.rating.label("rating"),
            func.coalesce(workload_subq.c.active_bookings, 0).label("active_bookings"),
        )
        .join(Provider, Provider.id == Service.provider_id)
        .outerjoin(workload_subq, workload_subq.c.provider_id == Provider.id)
        .filter(
            Service.category == service.category,
            Service.location.isnot(None),
            Service.approved == True,  # noqa: E712
            Provider.is_active == True,  # noqa: E712
            Provider.is_verified == True,  # noqa: E712
            Provider.is_suspended == False,  # noqa: E712
            func.ST_DWithin(Service.location, user_point, radius_m),
        )
    )

    # Prevent providers from matching their own services (self-booking)
    if current_user.provider:
        base_query = base_query.filter(Provider.id != current_user.provider.id)

    start = time.perf_counter()
    rows = base_query.all()
    elapsed_ms = (time.perf_counter() - start) * 1000
    candidate_count = len(rows)

    explain_plan = None
    if debug:
        try:
            compiled = base_query.statement.compile(
                dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}
            )
            explain_sql = text(f"EXPLAIN ANALYZE {compiled}")
            explain_plan = [row[0] for row in db.execute(explain_sql)]
        except Exception as exc:
            logger.warning("EXPLAIN ANALYZE failed: %s", exc)

    if not rows:
        return schemas.ProviderMatchResponse(
            items=[],
            total=0,
            top_n=top_n,
            radius_km=radius_km,
            criteria={"category": service.category},
            debug=schemas.MatchDebug(
                elapsed_ms=elapsed_ms,
                candidate_count=0,
                algorithm=algorithm,
                explain_analyze=explain_plan,
            ),
        )

    # Determine max distance for normalisation (avoid divide-by-zero)
    max_distance = max(float(r.distance_m or 0) for r in rows) or 1.0
    matches: List[schemas.ProviderMatchResult] = []
    debug_components: List[dict] = []

    for row in rows:
        distance_m = float(row.distance_m or 0)
        normalized_distance = distance_m / max_distance
        rating = float(row.rating or 0)
        inverse_rating = 1 - max(0.0, min(rating / 5.0, 1.0))
        active_bookings = int(row.active_bookings or 0)
        workload_penalty = min(active_bookings / MAX_ALLOWED_BOOKINGS, 1.0)
        trust_score = _compute_trust_score(db, row.provider_id)
        trust_component = 1 - trust_score
        availability_penalty = 0.0  # all candidates are active/verified/suspended-checked
        total_freq = sum(stats["provider_freq"].get(row.provider_id, 0) for stats in MATCH_STATS.values())
        dominance_penalty = min(total_freq / DOMINATION_CAP, 1.0)
        availability_penalty += dominance_penalty

        if algorithm == "baseline":
            score = normalized_distance
            availability_penalty_used = 0.0
            workload_penalty_used = workload_penalty
            trust_component_used = trust_component
        else:
            if algorithm == "hybrid":
                score = (
                    0.6 * normalized_distance
                    + 0.25 * inverse_rating
                    + 0.15 * workload_penalty
                )
                availability_penalty_used = availability_penalty
                workload_penalty_used = workload_penalty
                trust_component_used = inverse_rating  # legacy trust proxy
            else:  # trust_hybrid
                w_d = settings.MATCH_WEIGHT_DISTANCE
                w_t = settings.MATCH_WEIGHT_TRUST
                w_w = settings.MATCH_WEIGHT_WORKLOAD
                w_a = settings.MATCH_WEIGHT_AVAILABILITY
                score = (
                    w_d * normalized_distance
                    + w_t * trust_component
                    + w_w * workload_penalty
                    + w_a * availability_penalty
                )
                availability_penalty_used = availability_penalty
                workload_penalty_used = workload_penalty
                trust_component_used = trust_component

        matches.append(
            schemas.ProviderMatchResult(
                provider_id=row.provider_id,
                service_id=row.service_id,
                distance_km=round(distance_m / 1000, 3),
                rating=rating,
                score=round(score, 6),
                active_bookings=active_bookings,
                trust_score=round(trust_score, 4) if debug else None,
                availability_penalty=round(availability_penalty_used, 4) if debug else None,
                workload_penalty=round(workload_penalty_used, 4) if debug else None,
            )
        )
        if debug:
            debug_components.append(
                {
                    "provider_id": row.provider_id,
                    "distance_norm": normalized_distance,
                    "trust_score": trust_score,
                    "trust_component": trust_component_used,
                    "workload_penalty": workload_penalty_used,
                    "availability_penalty": availability_penalty_used,
                    "final_score": round(score, 6),
                    "weights": {
                        "distance": settings.MATCH_WEIGHT_DISTANCE,
                        "trust": settings.MATCH_WEIGHT_TRUST,
                        "workload": settings.MATCH_WEIGHT_WORKLOAD,
                        "availability": settings.MATCH_WEIGHT_AVAILABILITY,
                    },
                }
            )

    matches.sort(key=lambda m: m.score)
    top_matches = matches[:top_n]

    # record lightweight metrics (best match only)
    try:
        _record_match_stats(algorithm, top_matches[0], candidate_count)
    except Exception as exc:
        logger.warning("Failed to record match metrics: %s", exc)

    logger.info(
        "match/providers completed",
        extra={
            "algorithm": algorithm,
            "elapsed_ms": round(elapsed_ms, 3),
            "candidates": candidate_count,
            "top_score": top_matches[0].score if top_matches else None,
        },
    )

    return schemas.ProviderMatchResponse(
        items=top_matches,
        total=len(matches),
        top_n=top_n,
        radius_km=radius_km,
        criteria={
            "category": service.category,
            "algorithm": "0.6*distance + 0.25*inverse_rating + 0.15*workload_penalty"
            if algorithm == "hybrid"
            else ("distance_only" if algorithm == "baseline" else "trust_hybrid"),
        },
        debug=schemas.MatchDebug(
            elapsed_ms=elapsed_ms,
            candidate_count=candidate_count,
            algorithm=algorithm,
            explain_analyze=explain_plan,
            components=debug_components if debug else None,
        ),
    )


def _record_match_stats(algorithm: str, best: schemas.ProviderMatchResult, candidate_count: int) -> None:
    stats = MATCH_STATS.setdefault(algorithm, _init_stats()[algorithm])
    stats["count"] += 1

    distance = float(best.distance_km or 0)
    active = int(best.active_bookings or 0)

    stats["distance_sum"] += distance
    stats["distance_sq_sum"] += distance * distance
    stats["active_sum"] += active
    stats["active_sq_sum"] += active * active
    stats["candidate_count_sum"] += candidate_count
    stats["candidate_sq_sum"] += candidate_count * candidate_count
    stats["provider_freq"][best.provider_id] += 1


def _mean(sum_val: float, count: int) -> float:
    return (sum_val / count) if count else 0.0


def _std(sum_val: float, sum_sq: float, count: int) -> float:
    if count <= 1:
        return 0.0
    mean = sum_val / count
    variance = (sum_sq / count) - (mean * mean)
    return math.sqrt(variance) if variance > 0 else 0.0


def _compute_trust_score(db: Session, provider_id: int) -> float:
    total_bookings = (
        db.query(func.count(Booking.id))
        .filter(Booking.provider_id == provider_id)
        .scalar()
        or 0
    )
    accepted = (
        db.query(func.count(Booking.id))
        .filter(Booking.provider_id == provider_id, Booking.status == "accepted")
        .scalar()
        or 0
    )
    cancelled = (
        db.query(func.count(Booking.id))
        .filter(Booking.provider_id == provider_id, Booking.status == "cancelled")
        .scalar()
        or 0
    )
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    rating = float(provider.rating or 0) if provider else 0
    rating_norm = min(max(rating / 5.0, 0.0), 1.0)

    reports_count = (
        db.query(func.count(Report.id))
        .filter(
            Report.target_id == provider_id,
            func.coalesce(Report.target_type, Report.report_type) == "provider",
        )
        .scalar()
        or 0
    )

    accepted_ratio = (accepted / total_bookings) if total_bookings else 0.5
    cancel_ratio = (cancelled / total_bookings) if total_bookings else 0.0
    reports_penalty = min(reports_count / 5.0, 1.0)

    trust_score = (
        0.4 * accepted_ratio
        + 0.3 * rating_norm
        + 0.15 * (1 - cancel_ratio)
        + 0.15 * (1 - reports_penalty)
    )
    trust_score = min(max(trust_score, 0.0), 1.0)
    return trust_score or 0.5


def _summarize_stats() -> dict:
    summary = {}
    for algo, stats in MATCH_STATS.items():
        c = stats["count"]
        summary[algo] = {
            "requests": c,
            "avg_distance_km": _mean(stats["distance_sum"], c),
            "avg_active_bookings": _mean(stats["active_sum"], c),
            "workload_stddev": _std(stats["active_sum"], stats["active_sq_sum"], c),
            "candidate_avg": _mean(stats["candidate_count_sum"], c),
            "candidate_stddev": _std(stats["candidate_count_sum"], stats["candidate_sq_sum"], c),
            "provider_frequency": dict(stats["provider_freq"]),
        }
    return summary


@router.get("/metrics/matching")
def matching_metrics():
    """
    Lightweight, in-memory metrics for research/comparison.
    Non-blocking and resets on process restart.
    """
    summary = _summarize_stats()
    return {
        "algorithms": summary,
        "fairness": {
            "workload_stddev": {k: v["workload_stddev"] for k, v in summary.items()},
        },
    }

