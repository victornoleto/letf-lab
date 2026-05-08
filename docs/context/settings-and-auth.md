# Settings and Auth

Authentication uses JWT stored in an HttpOnly cookie.

## Auth Endpoints

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Seeded User

The seed script creates a default admin user unless one already exists.

Environment variables:

- `SEED_USER_EMAIL`
- `SEED_USER_PASSWORD`

Defaults are intended for local development only.

## Production Notes

- Set `AUTH_JWT_SECRET` to a long random value.
- Set `AUTH_COOKIE_SECURE=true` behind HTTPS.
- Configure CORS with `ALLOW_ORIGINS` for the frontend origin.
