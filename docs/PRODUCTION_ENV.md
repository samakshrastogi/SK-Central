# Production environment handoff

Use these local files when configuring production. They are deliberately ignored by Git because they contain secrets:

- `apps/api/.env.production` — SK Central API on Render
- `apps/web/.env.production` — SK Central web app on Vercel

The tracked `*.env.production.example` files are safe templates only. Never paste real API keys or signing secrets into a tracked file.

## Shared credentials

The SK Central API production file is the source of truth for credentials shared with other SK applications:

- `GEMINI_API_KEY` and `GEMINI_MODEL`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `SSO_TOKEN_SECRET` (copied to Mailpilot as `SK_CENTRAL_SSO_SECRET`)

Keep the SSO signing value identical in Central and each trusted SK application. Rotate all consumers together if it changes.

## Before deploying

Replace every `PASTE_...` value. In particular, Central still requires its production MongoDB URI. Configure the API file in Render and the web file in Vercel, then redeploy both services.
