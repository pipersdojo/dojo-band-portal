"use client";
import UserLogger from "../components/UserLogger";

// Remove the dashboard page, as home now serves as dashboard for logged-in users.
export default function DashboardPage() {
  return <UserLogger />;
}
