# Authentication page exposure

`login_page_view` and `registration_page_view` count separate, visible authentication page visits. They are not login or registration success events.

## Contract

- A visible login → register → login sequence produces two login events and one registration event, with three different `page_view_id` values.
- Rerenders, input validation, contact/authentication method changes, theme/language changes and temporary foreground/focus changes retain the current visit.
- OTP and authentication callback child steps retain the originating visit. Leaving authentication and returning starts a new visit. A document reload starts a new visit.
- Preloading, loading placeholders and already-authenticated redirects produce no exposure. The layout session check must finish before anonymous authentication exposure is enabled.
- Only a laid-out authentication form intersecting the foreground viewport triggers an event. The persistent Layout hook preserves the visit when the routed form is temporarily replaced by a child step or scan view.

## Event properties

- `page_view_id`: UUID for a displayed visit, stable across delivery retries
- `occurred_at`: UTC ISO timestamp of initial exposure, unchanged on retries
- `schema_version`: `1`
- `platform`: `web`
- `finger`: existing browser fingerprint when available; omitted if fingerprinting fails

Do not attach credentials, contact information, invite codes or full URLs. Missing fingerprints must remain unknown in visitor counts; do not fabricate identifiers or combine Web and App identifiers into one user.

Delivery uses the existing anonymous `/api/v1/trace` endpoint. Authentication exposure awaits delivery, suppresses authentication redirects/toasts, and attempts delivery at most twice with the same event payload. It does not use persistent `once` state or promise durable offline delivery.

Reports must deduplicate by event name, platform and `page_view_id`; raw rows may include retries. Do not interpret registration PV divided by login PV as a user conversion rate.

## Verification

Run `pnpm exec jest src/page/user src/layout/index.test.tsx src/lib/sendTrackEvent.test.ts src/lib/sendTrackEvent.retry.test.ts src/lib/sendTrackEvent.chat.test.ts src/lib/request.traceScope.test.ts --runInBand`, targeted ESLint, and `pnpm build`.

After an authorized test deployment, exercise direct entry, mode switches, repeated renders, OTP/scan return, background tabs, already-signed-in redirects and interrupted delivery. Verify actual trace ingestion and the deduplicated event counts, rather than relying only on HTTP success. Unit tests and a local build do not establish deployed coverage.
