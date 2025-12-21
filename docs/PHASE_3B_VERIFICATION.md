# Phase 3B Verification Checklist

Use this checklist to confirm the Phase 3B deliverables are working end-to-end.

## Services & UI
- [ ] Services render with images (fallback shown if missing)
- [ ] Map markers visible for services with coordinates
- [ ] Clicking markers highlights corresponding cards (and vice versa)
- [ ] Search filters services by title/category text
- [ ] Category filter narrows results correctly
- [ ] Empty states display friendly messaging when no services match
- [ ] Loading states (skeletons/spinners) appear while data is fetching

## Map
- [ ] Map does not crash with zero services
- [ ] Popups show service title and price
- [ ] Map updates when filters/search change

## Backend
- [ ] No backend errors in logs during basic browsing
- [ ] Services API returns approved services with image_url

## Infra
- [ ] Docker stack runs cleanly (`docker compose ps` shows backend/db up)
- [ ] No critical errors in `docker compose logs backend`

## Quick Smoke Steps
1) Start stack: `docker compose up -d`
2) Open frontend: `http://localhost:5173`
3) Verify services list shows cards with images and prices
4) Use search and category filter; confirm map updates
5) Check empty state by applying a filter that matches nothing
6) Tail backend logs for errors: `docker compose logs backend -f`
7) Stop stack when done: `docker compose down`

