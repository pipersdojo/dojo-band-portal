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

_Last updated: June 25, 2025_
