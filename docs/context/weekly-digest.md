# Weekly Digest

Weekly Digest summarizes strategy and portfolio context with AI assistance.

## Purpose

- Produce a weekly written summary.
- Cache generated digests by week.
- Allow manual regeneration.

## Main Data

- `GET /api/weekly-digest?limit=12`
- `POST /api/weekly-digest/regenerate?week_start=YYYY-MM-DD`

## Scheduler

The scheduler runs the digest job every Monday at 09:00 ET.

## AI Dependency

Digest generation is skipped if AI CLI integration is not configured.
