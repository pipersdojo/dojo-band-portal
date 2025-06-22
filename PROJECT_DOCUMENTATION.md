# Dojo University Band Portal

## Overview
The Dojo University Band Portal is a web application for managing bands, members, lessons, and custom requests. It is built with Next.js, Supabase, and a PostgreSQL database. The portal supports multiple bands, each with multiple members, and provides tools for band administration, invitations, and content management.

## Data Model
- **bands**: Represents a band (ensemble or group).
- **users**: Represents a user (musician, admin, etc.).
- **band_members**: Join table for many-to-many relationship between users and bands. Includes a `role` field (admin/member).
- **folders**: Content folders belonging to a band.
- **lessons**: Lessons within folders.
- **custom_requests**: User-submitted requests for compositions or conversions.
- **invitations**: Pending invites for users to join bands.

## Key Features
- Many-to-many band membership via `band_members` table.
- Band admins can manage members, send invites, and view requests.
- Users can belong to multiple bands.
- Secure authentication and authorization using Supabase and RLS.
- Content management for lessons and folders.

## Band Membership Flow
- When a user creates a band, they are added to `band_members` as an admin.
- Users can be invited to bands via email; upon acceptance, they are added to `band_members`.
- The admin dashboard lists all bands a user is a member/admin of, and allows switching between them.

## RLS (Row Level Security)
- All access to bands, members, folders, and lessons is controlled via RLS policies using `band_members`.
- Only band members can view or modify their band's data.
- Only admins can manage members and invitations.

## Development Notes
- All logic and queries should use `band_members` for membership checks.
- Old columns (`band_id`, `role` in `users`, `admin_id` in `bands`) have been removed from the schema and codebase.
- The schema and this documentation should be kept up to date as the project evolves.

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
