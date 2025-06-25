"use client";
import UserLogger from "../components/UserLogger";

export default function BandPage() {
  return (
    <>
      <UserLogger />
      <div className="max-w-2xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Page Removed</h1>
        <p className="text-red-500">
          This page has been removed. All band info and management is now handled
          in the Admin Dashboard.
        </p>
      </div>
    </>
  );
}
