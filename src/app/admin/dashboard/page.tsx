"use client";

// Admin Dashboard for managing band members and invites
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Types for members and invites
interface Member {
  id: string;
  email: string;
  role: string;
}
interface Invite {
  id: string;
  email: string;
  created_at: string;
  expires_at: string | null;
  claimed: boolean;
}

export default function AdminDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch current user to check admin
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          setError(`Auth error: ${userError.message}`);
          setLoading(false);
          return;
        }
        if (!user) {
          router.push('/');
          return;
        }
        // Fetch user row for role
        const { data: userRow, error: userRowError } = await supabase
          .from('users')
          .select('role, band_id')
          .eq('id', user.id)
          .single();
        if (userRowError) {
          setError(`User row error: ${userRowError.message}`);
          setLoading(false);
          return;
        }
        if (!userRow || userRow.role !== 'admin') {
          setError('Access denied. Admins only.');
          setLoading(false);
          return;
        }
        // Fetch members from band_members view
        const { data: membersData, error: membersError } = await supabase
          .from('band_members')
          .select('id, email, role')
          .eq('band_id', userRow.band_id);
        if (membersError) {
          setError(`Members fetch error: ${membersError.message}`);
          console.error('Members fetch error:', membersError);
        }
        // Fetch invites
        const { data: invitesData, error: invitesError } = await supabase
          .from('invitations')
          .select('id, email, created_at, expires_at, claimed')
          .eq('band_id', userRow.band_id);
        if (invitesError) {
          setError(`Invites fetch error: ${invitesError.message}`);
          console.error('Invites fetch error:', invitesError);
        }
        if (!membersError && !invitesError) {
          setMembers(membersData || []);
          setInvites(invitesData || []);
        }
      } catch (e) {
        setError(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`);
        console.error('Unexpected error:', e);
      }
      setLoading(false);
    };
    fetchData();
  }, [router]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Band Members</h2>
        <table className="w-full border mb-4">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.email}</td>
                <td>{m.role}</td>
                <td>
                  {/* TODO: Add actions (change role, remove) */}
                  <button className="text-blue-600 hover:underline mr-2" disabled>Change Role</button>
                  <button className="text-red-600 hover:underline" disabled>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">Pending Invites</h2>
        <table className="w-full border">
          <thead>
            <tr>
              <th>Email</th>
              <th>Created</th>
              <th>Expires</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invites.filter(inv => !inv.claimed).map((inv) => (
              <tr key={inv.id}>
                <td>{inv.email}</td>
                <td>{new Date(inv.created_at).toLocaleString()}</td>
                <td>{inv.expires_at ? new Date(inv.expires_at).toLocaleString() : 'N/A'}</td>
                <td>Pending</td>
                <td>
                  {/* TODO: Add actions (revoke) */}
                  <button className="text-red-600 hover:underline" disabled>Revoke</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* TODO: Add invite form */}
        <div className="mt-4">
          <button className="bg-blue-600 text-white px-4 py-2 rounded" disabled>Send Invite</button>
        </div>
      </section>
    </div>
  );
}
