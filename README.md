# GO Workout Firebase Read API scaffold

This is an additive backend scaffold. It does not modify `index.html`, existing Firestore documents, or Firestore Security Rules.

## What it does

- Exposes a GET-only HTTPS Cloud Function in `asia-northeast3`.
- Requires a Firebase Authentication ID token in `Authorization: Bearer <token>`.
- Verifies the token server-side, including revoked-token checks.
- Uses the verified token UID to read only `users/{uid}/appData`.
- Returns only `workout:*` documents and `body:records`; it excludes app settings.
- Supports optional `startDate` and `endDate` query parameters (`YYYY-MM-DD`).
- Sends `Cache-Control: no-store`.

## Deploy

Prerequisites:
- Node.js 20
- Firebase CLI
- Access to Firebase project `go-workout-87414`
- Cloud Functions deployment permissions
- A Firebase billing plan that supports Cloud Functions (Firebase may require Blaze)

From this folder after extracting:

```bash
cd functions
npm install
cd ..
firebase login
firebase deploy --only functions:workoutReadApi
```

The resulting endpoint will be:

`https://asia-northeast3-go-workout-87414.cloudfunctions.net/workoutReadApi`

## Not yet connected to ChatGPT

This scaffold is the secure API layer only. ChatGPT still needs an authenticated connector that can obtain and pass a valid Firebase ID token. Do not paste tokens, service-account keys, or private credentials into chat. The weekly automated report should be enabled only after the authenticated connector and endpoint have been deployed and tested.

## Important note

The current Firestore Security Rules remain unchanged. The function uses the Admin SDK, so authorization is enforced in code by verifying the caller token and deriving the UID from that token; never accept a UID from a query parameter.
