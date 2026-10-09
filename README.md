# Premier internal booking form

The flow is: Google sign-in → booking form → saved confirmation.

Only verified `@pitdrives.com` Google accounts can use the form. Server-side checks enforce this on every API call. Bookings are saved to the existing `bookings` collection in `pit-website-18883`, marked `source: internal-team`. There is no booking dashboard/list, no status editing, and no email integration. The public website's email code is unchanged.

## Updating from the previous ZIP

Extract this ZIP into a fresh folder rather than merging it into the old one, so removed API routes do not remain. Copy your already-populated `.env.local` into it. Do not overwrite that file with the example. `RESEND_API_KEY`, if already present, is unused and can be removed.

```bash
npm ci
npm run dev
```

## Firebase setup (same existing project)

1. Use the existing web config under Firebase Console → pit-website-18883 → Project settings → General → Your apps. No new Firebase project or web app is needed.
2. In Authentication → Sign-in method, enable Google and select a support email. Leave any existing providers unchanged.
3. In Authentication → Settings → Authorized domains, add `localhost` for local testing and your internal app's hostname when deployed. Keep existing domains.
4. Use the existing project's Admin credentials in the server variables. Keep the current Firestore database and rules unchanged; do not deploy the rules or auth blockers from the original ZIP.
5. Restart `npm run dev` after environment changes and test sign-in with your company Google account.

Required environment values:

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=your_existing_apiKey
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_existing_authDomain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=pit-website-18883
NEXT_PUBLIC_FIREBASE_APP_ID=your_existing_appId
FIREBASE_PROJECT_ID=pit-website-18883
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="your_private_key_with_\n_escapes"
```

The server credentials must belong to the same project as the web config. On Google hosting, Application Default Credentials may replace the service account email/key pair. Keep credentials out of source control. Add the optional `NEXT_PUBLIC_GEOAPIFY_API_KEY` for street/hotel suggestions; airport data is bundled, and manual location entry works too.

The server validates the Firebase ID token (including revocation), Google provider, verified email, and exact company domain. Outside Google accounts are signed out of this app and receive no booking access. Because this is a shared Firebase project, it does not deploy global authentication blocking functions; Firebase may still record an outside Google account in Auth before the app rejects it.

## Saving

The form stores the public booking fields plus operational details, a reference, and staff attribution. It uses `status: new` and `timeBasis: pickup-local`. Retries of the same submitted payload reuse an idempotency key to avoid duplicate records. After a save, the user sees a confirmation and can create another booking. No list of public bookings is fetched or displayed.

This app itself sends no emails. If your Firebase project has any separately deployed Firestore-triggered notification functions, they operate independently; those would need to exclude `source: internal-team`. The supplied public API route sends its emails directly through Resend, and this app never calls that route.

Saving is a booking record operation, not a live vehicle/chauffeur reservation or MyLimoBiz integration.

## Checks and deployment

Node.js 22+.

```bash
npm run typecheck
npm test
npm run build
```

Deploy as a separate Next.js site with the same environment configuration and its hostname authorized in Firebase. Leave the public website unchanged. Actual Google login and Firestore writes require your credentials and must be verified on your project.
