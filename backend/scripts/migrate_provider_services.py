"""
One-time migration to seed GlobalService + ProviderService from existing provider-owned services.
Legacy helper; prefer app.db.seed_demo for fresh demo data.
"""
import os
import sys
from collections import defaultdict

from sqlalchemy import and_

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal
from app.models import Service, GlobalService, ProviderService


def main():
    db = SessionLocal()
    try:
        # Build lookup for existing global services by (title, category)
        gs_lookup = {
            (gs.title.strip().lower(), (gs.category or "").strip().lower()): gs.id
            for gs in db.query(GlobalService).all()
        }

        created_global = 0
        created_provider_services = 0

        services = db.query(Service).all()
        for svc in services:
            key = (svc.title.strip().lower(), (svc.category or "").strip().lower())
            gs_id = gs_lookup.get(key)
            if not gs_id:
                gs = GlobalService(
                    title=svc.title,
                    category=svc.category or "General",
                    description=svc.description,
                    base_price=svc.price,
                    is_active=True,
                )
                db.add(gs)
                db.commit()
                db.refresh(gs)
                gs_id = gs.id
                gs_lookup[key] = gs_id
                created_global += 1

            exists = (
                db.query(ProviderService)
                .filter(
                    and_(
                        ProviderService.provider_id == svc.provider_id,
                        ProviderService.service_id == gs_id,
                    )
                )
                .first()
            )
            if exists:
                continue

            ps = ProviderService(
                provider_id=svc.provider_id,
                service_id=gs_id,
                price=svc.price,
                is_active=svc.approved,
            )
            db.add(ps)
            created_provider_services += 1

        db.commit()
        print(f"Created global services: {created_global}")
        print(f"Created provider services: {created_provider_services}")
    finally:
        db.close()


if __name__ == "__main__":
    main()


