# SK Central SSO

SK Central is the identity provider for SK applications. Applications should not implement their own primary login flow. They should request short-lived application tokens from SK Central and send those tokens to their own backend APIs.

## Local URLs

- SK Central web: `http://localhost:5475`
- SK Central API: `http://localhost:4002/api`
- SK Quiz web: `http://localhost:5474`
- SK Quiz API: `http://localhost:4001/api`
- SK Mailpilot web: `http://localhost:5173`
- SK Mailpilot API: `http://localhost:5000`

## Core Flow

1. User opens an SK application.
2. The application asks SK Central for `/auth/app-token?appId=<app-id>` with browser credentials.
3. If the SK Central session cookie is valid, SK Central returns a short-lived signed app token.
4. The application stores only the app token in memory/local app state and sends it as `Authorization: Bearer <token>`.
5. The application backend validates the SK Central signature and maps the identity to local domain data.
6. If SK Central has no valid session, the app redirects to `http://localhost:5475/login?returnTo=<current-url>`.

## SK Central Auth Endpoints

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `GET /auth/app-token?appId=sk-quiz`
- `GET /auth/app-token?appId=sk-mailpilot`
- `POST /auth/validate`
- `GET /auth/sessions`
- `POST /auth/logout`
- `POST /auth/global-logout`

## Security Model

- Central session is stored as an HttpOnly cookie named `sk_central_sid`.
- Session records are stored in MongoDB as hashed opaque tokens.
- SK applications receive short-lived signed app tokens, not the central session cookie.
- Global logout revokes all central sessions for the user.
- SK Quiz and SK Mailpilot accept SK Central app tokens signed with `SSO_TOKEN_SECRET` / `SK_CENTRAL_SSO_SECRET`.
- Google OAuth in SK Mailpilot is limited to connecting approved Gmail mailboxes; it is not a user sign-in provider.

## Adding Future Apps

1. Add the app origin to `ALLOWED_ORIGINS`.
2. Request an app token from SK Central with a unique `appId`.
3. Validate the signed token in the app backend.
4. Map `sub`, `email`, `name`, and `role` to the app's local domain user record if needed.
