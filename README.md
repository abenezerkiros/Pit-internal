# Premier Client Experience Desk

This is your existing internal Next.js app, updated with client profiles, single-booking PDF imports and an internal calendar. Your Google login, Firebase connection and blog editor are retained. No client photo is required.

## Start here

1. Extract the ZIP into a new folder. Keep your current app as a backup.
2. Copy your existing `.env.local` into this new folder. Keep the same Firebase settings. No new API key is required for PDFs or the calendar.
3. Use Node.js 22.13+ (or Node 24). In the new folder run:

```bash
npm ci
npm run dev
```

4. Open http://localhost:3000 and sign in with your company Google account.
5. Create a client. Open the profile, choose a single-booking detailed manifest PDF, check the extracted details and pickup time zone, then save.
6. Click Calendar. Open the booking to view the booking and client profile together. Imported bookings can be edited or marked completed/cancelled.

When ready, copy the updated source, package.json, package-lock.json and scripts into your internal app repository. Keep its `.env.local` and existing Vercel environment variables. Deploy the INTERNAL app, not the public website. Run `npm ci` after copying. There are no new production environment variables.

## What is included

- Home after login: searchable client directory, Add client, and a first-client empty state.
- Profiles: full name, title, company, client-since month, compiled-by, automatic updated date, significant addresses, welcome preferences and standing arrangements.
- PDF import: one booking only, original text-based Reservations Manifest - Detailed View layout. 8 MB / 10-page limit. Multi-booking PDFs, scans and unrecognized layouts are rejected explicitly.
- Editable extracted passenger, contact, pickup/drop-off, date/time, passenger count, chauffeur, vehicle, plate, account, payment, trip type, flight and notes fields.
- PDFs are parsed locally in the browser with PDF.js. Only the confirmed structured booking is sent to your server. No raw PDF storage, OCR, paid AI, Cloud Functions or Firebase Storage dependency is added.
- Shared month calendar with daily filters and a list below it; calendar navigation from every workspace page and from the authenticated blog editor.
- Duplicate reservation prevention across users, using the manifest reservation number. A repeat with identical data returns the saved record; changed data prompts you to edit the existing booking.
- Version checks prevent one staff member silently overwriting another's changes.
- Existing bookings with a YYYY-MM-DD `date` field appear on the calendar. Older bookings without a clientId show their booking details with a notice that no profile is linked. Imported records link to the current client profile, not a historical snapshot.

## Firebase and data

Uses your existing Firebase project and Admin credentials. Profiles are stored in `clients`; imports use the existing `bookings` collection with `source: internal-manifest`. Collections are created on first save. All new API handlers verify the existing company Google identity, including verified email, exact pitdrives.com domain and token revocation. There is no new public data endpoint.

Do not make Firestore rules public. These endpoints use the Admin SDK, so browser access to `clients` and `bookings` does not need to be enabled. Keep these collections private under your existing rules; if your project currently has a broad allow-all rule, that must be corrected before storing client information. Do not replace the shared project's rules wholesale, as it also serves the public website and blog.

Queries use normal single-field indexes for `date` and `clientId`. If you disabled those indexes in your project, re-enable them. Calendar data is loaded by month; records are paginated internally so they are not silently truncated.

The app itself does not send booking emails. Any independently deployed Firestore notification trigger must exclude `source: internal-manifest` if you do not want notifications for imports. This imports existing reservation data into your internal records; it does not create or update reservations in Limo Anywhere and it does not sync Google Calendar.

## PDF interpretation

The reader is designed for the supplied detailed reservations manifest. It uses text positions to separate Passenger, Account, Driver Info, Payment and Trip Info columns rather than merging them. Wrapped names, addresses, notes and additional passengers are retained. Always check extraction before saving. A changed report template may need a parser adjustment.

The supplied PDF does not include a time zone. The form defaults to America/New_York and requires staff to confirm/change it. The calendar groups by pickup-local date and displays pickup-local time, not a converted UTC schedule. No trip duration is invented.

Profiles are created and maintained manually; importing a booking does not overwrite the client's standing preferences or addresses.

## Files changed

- `src/components/workspace.tsx`: same login, new post-login directory/navigation.
- `src/components/client-desk/`: directory, profiles, import form, calendar, booking panel and scoped styles.
- `src/lib/client-desk/`: validation, PDF reader/parser, API helpers.
- `src/app/clients/`, `src/app/calendar/`: new pages.
- `src/app/api/clients/`, `src/app/api/journeys/`: authenticated profile and booking APIs.
- `src/components/premier-blog/BlogAdmin.tsx`: Calendar link alongside logout.
- `src/app/globals.css`: workspace navigation styles appended.
- `scripts/copy-pdf-worker.mjs`: installs the same-version local PDF worker automatically.
- package files: PDF.js and patched Next.js dependency; installation lock repaired.

The old internal booking form and POST /api/bookings remain in the source for compatibility, but are no longer the post-login screen. Existing records are not deleted or migrated.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

Live Firebase sign-in and database writes require your environment and must be checked locally before deployment. No real client or booking was created during development. See VERIFICATION.md for the exact completed checks and limits.
