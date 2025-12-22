"""
Lightweight schema guard for dev/demo.
Ensures critical columns/tables exist without dropping data.
"""
from sqlalchemy import inspect, text

REQUIRED_COLUMNS = {
    ("bookings", "global_service_id"),
}


def ensure_schema(engine):
    """Run at startup to patch missing columns/constraints."""
    with engine.begin() as conn:
        inspector = inspect(conn)

        # Ensure bookings.global_service_id column exists
        if inspector.has_table("bookings"):
            cols = {col["name"] for col in inspector.get_columns("bookings")}
            if "global_service_id" not in cols:
                conn.execute(
                    text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS global_service_id INTEGER")
                )

            # Ensure FK to global_services
            fks = inspector.get_foreign_keys("bookings")
            has_fk = any(
                fk.get("constrained_columns") == ["global_service_id"]
                for fk in fks
            )
            if not has_fk and inspector.has_table("global_services"):
                conn.execute(
                    text(
                        """
                        DO $$
                        BEGIN
                          IF NOT EXISTS (
                            SELECT 1 FROM information_schema.table_constraints
                            WHERE constraint_name = 'bookings_global_service_id_fkey'
                              AND table_name = 'bookings'
                          ) THEN
                            ALTER TABLE bookings
                              ADD CONSTRAINT bookings_global_service_id_fkey
                              FOREIGN KEY (global_service_id)
                              REFERENCES global_services(id)
                              ON DELETE SET NULL;
                          END IF;
                        END$$;
                        """
                    )
                )


def schema_health(engine):
    """Return list of missing schema elements."""
    issues = []
    with engine.begin() as conn:
        inspector = inspect(conn)
        for table, column in REQUIRED_COLUMNS:
            if not inspector.has_table(table):
                issues.append(f"Missing table: {table}")
                continue
            cols = {col["name"] for col in inspector.get_columns(table)}
            if column not in cols:
                issues.append(f"Missing column: {table}.{column}")
    return issues

