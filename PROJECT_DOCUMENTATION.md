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

_Last updated: June 22, 2025_
