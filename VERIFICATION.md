# Verification

Completed on 12 November 2026:

- `npm run typecheck`: passed.
- `npm test`: 14 tests passed. Covers PDF column separation, midnight/noon conversion, single-booking enforcement, unsupported/scanned PDF errors, wrapped passenger names, missing-count warning, profile validation, booking validation, calendar month boundaries, and existing identity/security checks.
- `npm run build`: passed using Next.js 16.4.6. The uploaded 16.4.0 build reported a security vulnerability; dependency and lockfile were updated.
- Before the session pause, the parser was exercised against the supplied real PDF: the combined five-trip report was rejected; all five trip blocks tested separately extracted their reservation IDs, pickup/drop-off and passenger counts correctly. No source PDF or real passenger fixture is included in this ZIP.
- Before the pause, desktop browser QA with temporary synthetic fixtures verified the client directory, client profile, calendar navigation, booking detail dialog and edit fields. These screen files were restored from the implementation after the workspace reset. No mock authentication or fixture data is included.

Not verified against production:

- Google sign-in and live Firestore reads/writes: credentials were not provided. No actual bookings were created.
- End-to-end browser file selection and PDF worker import: parser and build checks passed; the file-picker-to-save flow must be smoke-tested in your environment.
- Mobile browser layout: responsive CSS is present, but the attempted iframe-based mobile preview was blocked by the existing frame-protection header. That header was kept intact.

## First local smoke test

1. Keep your current `.env.local` and start with `npm ci` then `npm run dev`.
2. Sign in with an authorized staff Google account; confirm an outside account is denied.
3. Create a test client, refresh and reopen it; confirm details persist.
4. Upload one text-based detailed booking manifest; confirm fields and time zone, then save.
5. Open Calendar at the booking month, open the booking and verify its client profile and booking information.
6. Upload the same booking again: confirm it does not create a second event.
7. Edit the booking date or status, save, and verify the calendar updates. Reload to confirm persistence.
8. Test on a phone; the monthly grid scrolls horizontally within its own container, and the booking list underneath remains a narrow-screen alternative.
9. Open the blog editor to confirm its existing access and publishing behavior remain intact.
