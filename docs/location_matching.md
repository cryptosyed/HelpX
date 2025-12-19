# Location-Based Provider Matching

## Constraint Filtering
- **Category match**: Only providers offering services in the same category as the requested service.
- **Provider state**: `is_active = true` and `is_verified = true`; prevents unavailable or untrusted providers.
- **Spatial guardrail**: `ST_DWithin(service.location, user_point, radius_m)`; default radius 10 km (configurable).
- **Safety**: Excludes the requesting provider to prevent self-assignment.

## Geospatial Distance
- Service locations are stored as `Geography(Point, 4326)` so PostGIS returns real-world meters.
- Distance computed with `ST_Distance(service.location, user_point)` and converted to kilometers.
- Normalisation uses the maximum observed distance within the candidate set (fallback to 1m) to avoid divide-by-zero.

## Weighted Scoring

```
score = 0.6 * normalized_distance
      + 0.25 * inverse_rating
      + 0.15 * workload_penalty
```

- `normalized_distance = distance_m / max_distance_m`
- `inverse_rating = 1 - clamp(rating/5, 0, 1)` (ratings assumed on a 0–5 scale)
- `workload_penalty = clamp(active_bookings / MAX_ALLOWED_BOOKINGS, 0, 1)` with `MAX_ALLOWED_BOOKINGS=20`
- Lower score = better rank. Sorting is deterministic and explainable (no randomness or ML).

## Ranking & Output
- Candidates are ordered by ascending score; default top 5 are returned with provider id, service id, distance (km), rating, workload, and final score.
- Results include the applied criteria to keep the response audit-friendly.

## Time Complexity
- SQL pre-filter reduces the candidate set to providers within the radius and category.
- Python-side scoring runs in `O(n log n)` due to the final sort (where `n` is the number of radius-filtered providers). Memory usage is `O(n)` for the candidate list.

## Extensibility
- Scoring weights are centralized constants for quick experimentation.
- The deterministic scoring layer can be swapped for an ML ranker later without changing the API shape.

