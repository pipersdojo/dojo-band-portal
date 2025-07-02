# Dojo University Band Portal

## Overview
The Dojo University Band Portal is a web application for managing bands, members, lessons, and custom requests. It is built with Next.js, Supabase, and a PostgreSQL database. The portal supports multiple bands, each with multiple members, and provides tools for band administration, invitations, and content management.

## Data Model (2025)
- **bands**: Represents a band (ensemble or group). Now includes a `lesson_limit` column to restrict the number of lessons per band.
- **users**: Represents a user (musician, admin, etc.). No longer contains `band_id` or `role` columns.
- **band_members**: Join table for many-to-many relationship between users and bands. Includes a `role` field (admin/member).
- **folders**: Content folders belonging to a band. Each folder is associated with a band.
- **lessons**: Lessons that can be organized into folders and associated with bands. No longer contains a `folder_id` column; relationships are managed via join tables.
- **band_lessons**: Join table associating lessons with bands, enforcing per-band lesson limits.
- **folder_lessons**: Join table associating lessons with folders for flexible organization.
- **custom_requests**: User-submitted requests for compositions or conversions.
- **invitations**: Pending invites for users to join bands.

## Schema Overview
- Many-to-many band membership via `band_members`.
- Lessons and folders are decoupled and managed via join tables for scalability.
- `lesson_limit` in `bands` enforces a maximum number of lessons per band.
- All deprecated columns (`band_id`, `role` in `users`, `admin_id` in `bands`, `folder_id` in `lessons`) have been removed.

## Key Features
- Robust many-to-many band membership and admin/member roles.
- Band admins can manage members, send invites, and view requests.
- Users can belong to and switch between multiple bands.
- Scalable lessons/folders system with per-band lesson limits.
- Secure authentication and authorization using Supabase and RLS.
- Modern navigation: dashboard/home combined, conditional links, and improved user flows.

## Band Membership Flow
- When a user creates a band, they are added to `band_members` as an admin.
- Users can be invited to bands via email; upon acceptance, they are added to `band_members`.
- The admin dashboard lists all bands a user is a member/admin of, and allows switching between them.
- Band pages (`/band/[id]`) show band info, members, and lessons/folders (UI scaffolding in progress).

## Lessons & Folders
- Lessons are associated with bands via `band_lessons` and with folders via `folder_lessons`.
- Each band can have up to `lesson_limit` lessons.
- Folders provide flexible organization for lessons within a band.
- UI for managing lessons/folders is being scaffolded and will be expanded.

## RLS (Row Level Security)
- All access to bands, members, folders, and lessons is controlled via RLS policies using `band_members`.
- Only band members can view or modify their band's data.
- Only admins can manage members and invitations.
- RLS policies are updated for all new tables and flows; further refinement ongoing as features expand.

## Permissions & Access Control

- **Admin-only actions:** Only users with the `admin` role in a band (as defined in `band_members`) can:
  - Access the Admin Dashboard (`/admin/dashboard`)
  - Manage members and invitations
  - Add, update, or remove folders
  - Add, update, or remove lessons
  - Add public lessons to the band
- **Members (non-admins):**
  - Cannot access the Admin Dashboard or any `/admin` routes
  - Cannot add, update, or remove folders, lessons, or public lessons
  - Can only view band content and their own profile
  - In the future, members will also be restricted from viewing or managing any band payment or subscription information

These restrictions are enforced both in the UI (conditional rendering of actions/links) and at the database level (via Supabase RLS policies).

## Development Notes
- All logic and queries should use `band_members` for membership checks.
- Deprecated columns and old logic have been removed from the schema and codebase.
- The schema (`supabase_schema.sql`) and this documentation are kept up to date as the project evolves.
- Debug logging and troubleshooting are in place for Supabase RLS and Next.js issues.

## Setup
1. Clone the repository.
2. Install dependencies: `npm install`
3. Set up environment variables in `.env.local` (see example in repo).
4. Run the development server: `npm run dev`
5. Apply the schema in `supabase_schema.sql` to your Supabase/Postgres instance.

## Updating
- As features or data models change, update both the schema and this documentation.
- Use clear commit messages and keep the documentation in sync with the codebase.

---

## Recent Debugging & RLS Policy Lessons (June 25, 2025)

### Debugging Band Member Access to Lessons in Folders
- Issue: Band members (non-admins) could not see lessons in folders, even though they were listed as members and folders/lessons existed.
- Cause: The RLS (Row Level Security) policy on the `folder_lessons` table only allowed users with the `admin` role to select rows. Members were excluded.
- Solution: The RLS policy was updated to allow all band members (not just admins) to select rows from `folder_lessons` for their band. Example policy:

```sql
EXISTS (
  SELECT 1
  FROM (folders
    JOIN band_members ON band_members.band_id = folders.band_id)
  WHERE folders.id = folder_lessons.folder_id
    AND band_members.user_id = auth.uid()
)
```
- Result: After updating the policy, members can now see lessons in folders as expected.

### Debugging/Developer Experience Improvements
- Added a reusable `UserLogger` React component that logs the current authenticated user and their band memberships to the browser console on every page. This helps quickly diagnose user/session issues.
- Added detailed debug logging to the band page to show the results of all Supabase queries (band, members, folders, lessons, join tables) and any errors, making it easier to pinpoint RLS or data issues.
- Provided SQL queries for inspecting join tables and RLS policies directly in Supabase for future troubleshooting.

---

## Kajabi Membership Integration (Planned)

### Overview
This feature will allow users and admins to activate or revoke a Dojo U membership (Kajabi offer) directly from the band portal. Membership status will be kept in sync with band membership and payment status, using secure webhooks and server-side API calls.

### User & Admin Flows
- **Standard users** will see a button on their dashboard to activate their Dojo U membership. Clicking it will trigger a secure server-side call to the Kajabi offer activation webhook for their account.
- **Admins** will have the same button, and may also see controls for managing memberships for their band members.
- If a user is removed from a band, the system will automatically trigger the Kajabi revoke webhook for that user.
- If a band's status becomes void (e.g., lapsed payment, subscription termination), the system will revoke all associated Kajabi memberships.

### Technical Implementation
- **API Endpoints:**
  - `/api/kajabi/activate`: Activates a Kajabi offer for a user. Validates the user's session and permissions, then calls the Kajabi webhook using a secret API key stored in server environment variables.
  - `/api/kajabi/revoke`: Revokes a Kajabi offer for a user. Used when a user is removed from a band or when a band's status is voided.
- **Security:**
  - All Kajabi API/webhook calls are made server-side. No credentials or secrets are ever exposed to the client.
  - API keys and webhook URLs are stored in environment variables and never committed to source control.
  - Optionally, use signed JWTs or HMAC signatures for webhook payloads if supported by Kajabi.
- **Automation:**
  - Member removal logic and band status change logic will call the revoke endpoint for affected users.
  - Payment or subscription status changes (e.g., via Stripe webhook) will trigger revocation for all band members if needed.
- **Error Handling:**
  - All API calls log actions and errors for audit and debugging.
  - Users and admins receive clear feedback if activation or revocation fails.

### Example API Route (Activation)
```typescript
// /src/app/api/kajabi/activate/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { name, email, external_user_id, offerId, siteId } = await req.json();
  // Validate user session and permissions here

  // Build Kajabi webhook URL (no API key required)
  const webhookUrl = `https://checkout.newkajabi.com/webhooks/offers/${offerId}/${siteId}/activate?send_offer_grant_email=true`;

  // Call Kajabi webhook securely (no Authorization header needed)
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, email, external_user_id }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Kajabi activation failed" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
```

_Note: Kajabi webhooks do not require an API key or secret in the headers. Only the correct URL and payload are needed._

### Best Practices
- Never expose Kajabi API keys or webhook secrets to the client or in public repos.
- Use environment variables for all sensitive config.
- Log all membership changes for audit and support.

### Next Steps
- Implement the user-facing button and activation API route.
- Integrate revocation logic into member removal and band status change flows.
- Test end-to-end with real Kajabi webhooks and offers.

---

## Stripe Subscription Integration (Planned)

### Overview
This integration will enable bands to subscribe to the portal using Stripe for recurring billing (monthly or yearly). Stripe Checkout and Customer Portal will be used for all payment and billing management, ensuring PCI compliance and a seamless user experience. Subscription status will control access to band features and automate Kajabi membership revocation if payment lapses.

### Key Features
- Secure, recurring billing via Stripe (monthly or annual plans)
- **Each subscription tier is a separate Stripe Product.** (Do not use multiple Prices under a single Product for tiers.)
- Stripe Checkout for new subscriptions (off-site, branded, supports Apple Pay, Google Pay, ACH, etc.)
- Stripe Customer Portal for managing billing, updating payment methods, viewing invoices, and cancelling
- Webhook-driven automation for access control and Kajabi revocation
- Renewal reminders and in-app notifications before billing
- Admin dashboard shows current subscription status and renewal date

### Data Model Changes
- Add to `bands` table:
  - `stripe_customer_id`
  - `stripe_subscription_id`
  - `stripe_product_id` (**NEW: stores the active Stripe Product ID for the band's tier**)
  - `subscription_status` (e.g., active, lapsed, cancelled)
  - `current_period_end` (timestamp for next renewal)

### Tier Mapping & Features
- **Each tier is a separate Stripe Product.**
- Maintain a mapping of Stripe Product IDs to internal tier names and features (lesson/member limits, etc.).
- Example:

```typescript
// src/lib/stripeTiers.ts
export const STRIPE_PRODUCT_TIERS = {
  'prod_ABC123': { name: 'Starter', lessonLimit: 5, memberLimit: 3 },
  'prod_DEF456': { name: 'Pro', lessonLimit: 20, memberLimit: 10 },
  'prod_GHI789': { name: 'Elite', lessonLimit: 100, memberLimit: 30 },
};
```
- Use this mapping in both the webhook handler and the UI to display the current tier and enforce limits.

### User/Admin Flows
1. **Start Subscription**
   - Admin clicks “Start Subscription” in the dashboard
   - App calls `/api/stripe/create-checkout-session` and redirects to Stripe Checkout
   - Admin completes payment; Stripe redirects back to portal
   - Webhook updates band status to `active`, stores Stripe IDs, **stores the Product ID as `stripe_product_id`**, and sets `current_period_end`
   - App updates lesson/member limits/features based on the active Product

2. **Switch/Upgrade/Downgrade Tier**
   - Admin uses Stripe Customer Portal to change plan (switches Product)
   - Stripe handles proration and billing
   - Webhook receives `customer.subscription.updated` event, updates `stripe_product_id` and all relevant fields
   - App updates lesson/member limits/features based on the new Product

3. **Manage Subscription**
   - Admin clicks “Manage Billing”
   - App calls `/api/stripe/create-customer-portal-session` and redirects to Stripe Customer Portal
   - Admin can update payment, view invoices, cancel, etc.

4. **Renewal & Reminders**
   - Stripe sends `invoice.upcoming` webhook (default: 7 days before renewal)
   - App sends reminder email (via Resend) and/or in-app notification
   - Optionally, send additional reminders (e.g., 1 day before)

5. **Payment Failure or Cancellation**
   - Stripe sends `invoice.payment_failed` or `customer.subscription.deleted` webhook
   - App updates band status to `lapsed` or `void`, restricts access, and triggers Kajabi revocation for all members
   - Admin receives email and in-app warning

6. **Reactivation**
   - Admin can restart subscription via dashboard (redirect to Stripe Checkout or Portal)
   - On payment, access is restored and Kajabi can be reactivated

### Webhook Logic
- On relevant Stripe events (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`):
  - Extract the active Product ID from the subscription object.
  - Update the band's `stripe_product_id` in the database.
  - Use the Product ID to look up the tier/features and update lesson/member limits accordingly.
  - Log all updates for audit/debugging.

### API Endpoints
- `/api/stripe/create-checkout-session` (POST):
  - Authenticates admin, creates Stripe Checkout session, returns URL
- `/api/stripe/create-customer-portal-session` (POST):
  - Authenticates admin, creates Stripe Customer Portal session, returns URL
- `/api/stripe/webhook` (POST):
  - Handles all relevant Stripe events (checkout completed, invoice upcoming, payment failed, subscription deleted/updated)
  - Updates band status, stores Product ID, updates limits/features, sends reminders, triggers Kajabi revocation as needed

### Security
- All Stripe secret keys and webhook signing secrets are stored in environment variables
- Only authenticated admins can initiate billing actions
- No payment data is ever handled or stored by your app

### Reminder System
- Listen for `invoice.upcoming` webhook
- Send branded reminder emails via Resend (7 days and/or 1 day before renewal)
- Show in-app notifications in admin dashboard
- Store `current_period_end` in database for custom logic

### Payment Methods Supported
- Credit/debit cards
- Apple Pay, Google Pay
- ACH bank transfer (if enabled in Stripe)
- Link by Stripe
- Other local payment methods (depending on Stripe settings and user location)

### Best Practices
- Use Stripe’s hosted pages for all billing (no custom payment forms)
- Keep all Stripe secrets server-side
- Log all subscription changes for audit/support
- Test thoroughly in Stripe test mode before going live

### Pricing & Plan Selection UX (2025 Update)

- Stripe Checkout does not support displaying multiple subscription options for user selection in a single session.
- The app should present a pricing table or graph in the UI, showing each tier's features, limits, and price.
- Each tier should have a clear “Select” or “Start” button.
- When a user clicks a tier, the app creates a Stripe Checkout Session for that tier’s Price ID and redirects the user to Stripe Checkout.
- Add a note such as: “You can change your plan at any time in the billing portal after checkout.”
- If you want to let users enter a desired number of users, map their selection to the closest tier and show the corresponding option, or use per-seat pricing (not currently implemented).
- After initial purchase, users can upgrade/downgrade in the Stripe Customer Portal, which handles proration and switching between products/tiers.
- This approach matches common SaaS UX patterns and provides clarity and flexibility for users.

---

## Stripe Sandbox & Go-Live Protocol

#### Stripe Sandbox (Test Mode)
- Use Stripe “test” secret and publishable keys in `.env.local`.
- All API calls, Checkout sessions, and Customer Portal links operate in test mode.
- Use Stripe’s test cards (e.g., 4242 4242 4242 4242 for Visa) and test bank details for ACH.
- Trigger webhooks using the Stripe CLI or Dashboard, and test all success/failure scenarios.
- Check the Stripe Dashboard (toggle “Viewing test data”) to see test customers, payments, and subscriptions.
- Test all flows: new sign-up, payment method updates, cancellations, renewals, payment failures, webhook handling, reminder emails, access control, and Kajabi revocation logic.

#### Going Live (Production Launch)
1. Replace test keys with your Stripe “live” secret and publishable keys in `.env.local`.
2. Update webhook endpoints in the Stripe Dashboard to point to your production URL.
3. Double-check that your domain is correct in Stripe settings (for redirects).
4. Ensure all environment variables (Stripe, Resend, etc.) are set for production.
5. Test a real payment with a real card (use a small amount).
6. Monitor Stripe Dashboard for real activity and errors.
7. Announce launch to users!

**Important:**
- Never mix test and live keys.
- Webhooks must be set up separately for test and live modes.
- All test data stays in test mode; live mode starts with a clean slate.

| Step                | Test Mode (Sandbox)         | Live Mode (Production)      |
|---------------------|----------------------------|-----------------------------|
| API Keys            | Test keys                   | Live keys                   |
| Payments            | Test cards/banks            | Real cards/banks            |
| Webhooks            | Test endpoints              | Production endpoints        |
| Dashboard           | “Viewing test data”         | “Viewing live data”         |
| Data                | Not visible to real users   | Real users/data             |

---

### Edge Case: Over-Limit Members on Tier Downgrade

- If a band downgrades to a tier with a lower member limit than their current member count, the following should occur:
  - Non-admin members are blocked from logging in or accessing band content until the band is within the allowed member limit.
  - Admins are allowed to log in, but see a prominent alert/banner instructing them to remove members to restore access for others.
  - No members are automatically removed; the admin must manually reduce the member count.
  - Once the member count is within the limit, normal access is restored for all.
- This logic should be enforced in a top-level layout, provider, or middleware to ensure consistency across the app.
- This is a common SaaS pattern and provides a clear, user-friendly way to handle overages after a downgrade.

---

_Last updated: July 2, 2025_
