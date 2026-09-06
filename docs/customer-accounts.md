# Customer accounts

CoachRank customers sign in with a Firebase email link or Google before starting a new assessment purchase. The verified Firebase UID owns the order. Both methods resolve to the same UID when the same email is used and Firebase's one-account-per-email setting is enabled.

## Customer journey

- `/sign-in` supports new and returning customers with the same form. It accepts only known local return destinations. An email opened on another device asks for the email again; the email is never placed in the return URL. Used or expired links have a clear retry path.
- `/my-tools` shows only the signed-in customer's purchases. It links to a specific order so another tab cannot silently change which assessment is being saved or downloaded.
- `/tools/brand-clarity` names the account a new purchase will belong to. Existing owners receive an open-assessment action in place of another checkout.
- Checkout stores ownership before calling Dodo and prefills the verified email. A per-customer Firestore lease serializes checkout starts across instances. Pending Dodo sessions are reused during their documented 24-hour validity.
- Verified webhooks unlock orders. An authenticated reconciliation endpoint can check Dodo's session and payment APIs when a notification is delayed. Neither a return URL nor browser-submitted payment data grants access.
- Sign-out clears customer session and assessment access cookies. It leaves reports, Studio login and admin preview untouched.

## Access boundary

The server exchanges a verified, recently authenticated Firebase ID token for the HTTP-only `cr_customer` session cookie, valid for up to 14 days. Reads check revocation and verified email. Sign-in, sign-out, checkout, recovery and assessment writes enforce same-origin requests. Rate limits supplement Firebase's authentication abuse controls. Application rate limits remain per-instance except the distributed checkout lease.

The customer SDK uses a separate Firebase app with in-memory persistence. It signs out of the client SDK after the server session is established. This keeps Studio and customer sessions independent and avoids persisting customer refresh tokens in browser storage.

Account-linked order reads, saves, report history and PDFs enforce UID ownership. Firestore client rules deny customer data access; the server reads the CoachRank database. The account and sign-in pages are private, no-store and noindex. Customer sign-in does not confer admin access.

## Earlier purchases

Earlier, unconnected purchases keep their private-link access. An authenticated customer explicitly connects one from My tools using either the private token or a Dodo payment ID. Receipt recovery checks the verified account email against Dodo's customer email, payment status, original order reference, product, price and payment ID. It only connects an already paid order. Transactions prevent transferring an already connected purchase and prevent an old unowned write after ownership changes. Admin previews cannot be claimed.

Once connected, the owning account must sign in. The legacy token alone no longer opens reports. A pending legacy checkout may still complete through the existing webhook and then be connected by private link or receipt.

## Firebase configuration

Production uses the existing `corporate-gupshup` project and the isolated `coachrank` Firestore database. Google sign-in and `coachrank.lol` authorization were confirmed. On September 6, 2026, `signIn.email.passwordRequired` was set to false with a field-specific configuration update to allow email-link sign-in alongside existing email/password sign-in. Other project settings and email templates were preserved. One account per email remains enabled.

Because Firebase Auth is shared with another project identity, Google consent and Firebase-generated email branding follow that project's existing configuration. No global brand or email-template rename was made. Customer pages and reports use CoachRank branding.

## Verification

Automated coverage includes customer ownership, no-cookie recovery, crossed account IDs, copied tokens, preview isolation, legacy migration, receipt mismatches, reversed payments, session age, revoked credentials, CSRF, return URLs, duplicate checkout starts and verified payment reconciliation. The standalone app was exercised against real local Auth and Firestore emulators for email links, one-time code rejection, Google/email UID consistency, sessions, a second customer, report saves, PDF downloads, sign-out and legacy claims. Fixtures represent simulated purchases; no real card charge is part of these tests.

Production browser review on September 7, 2026 confirmed Google sign-in and email-link sign-in returning to the same customer workspace and pending order. The email arrived in Gmail Spam, with the shared project's Corporate Gupshup name and Firebase sender. A CoachRank-specific sender and delivery setup remains necessary to improve this experience without changing another app's shared templates. Google sign-in remains available.

The live checkout displayed the $9 assessment plus $1.62 GST for India, totaling $10.62. Product, webhook signature configuration and private-route checks passed. A completed real Dodo purchase with automatic access still needs verification. Never fabricate a successful production payment or use production admin privileges to grant a test purchase.

References: [Firebase email links](https://firebase.google.com/docs/auth/web/email-link-auth), [Firebase Google sign-in](https://firebase.google.com/docs/auth/web/google-signin), [Firebase session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies), [Dodo checkout integration](https://docs.dodopayments.com/developer-resources/integration-guide).
