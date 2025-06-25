"use client";

// Admin Dashboard for managing band members and invites
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Types for members, invites, and bands
interface Member {
  id: string;
  role: string;
  user: {
    id: string;
    email: string;
    full_name?: string;
  };
}
interface Invite {
  id: string;
  email: string;
  created_at: string;
  expires_at: string | null;
  claimed: boolean;
}
interface Band {
  id: string;
  name: string;
}

export default function AdminDashboard() {
  const [bands, setBands] = useState<Band[]>([]);
  const [selectedBand, setSelectedBand] = useState<Band | null>(null);
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
        // Fetch current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('[DEBUG] Current user:', user);
        if (user) {
          console.log('[DEBUG] user.id used for query:', user.id);
        }
        if (userError) {
          setError(`Auth error: ${userError.message}`);
          setLoading(false);
          return;
        }
        if (!user) {
          router.push('/');
          return;
        }
        // Fetch all bands where user is a member (or admin)
        const { data: bandMemberships, error: bandMembershipsError } = await supabase
          .from('band_members')
          .select('band:bands(id, name), role, band_id, user_id')
          .eq('user_id', user.id);
        console.log('[DEBUG] bandMemberships result:', bandMemberships);
        if (bandMembershipsError) {
          setError(`Band memberships error: ${bandMembershipsError.message}`);
          setLoading(false);
          return;
        }
        const adminBands = (bandMemberships || []).filter((bm: any) => bm.role === 'admin').map((bm: any) => bm.band).filter((b: any) => b && b.id && b.name);
        const bandsList = (bandMemberships || [])
          .map((bm: any) => bm.band)
          .filter((b: any) => b && b.id && b.name);
        setBands(bandsList);
        // If user is not an admin of any band, redirect
        if (adminBands.length === 0) {
          setError('You must be an admin to access this page.');
          router.push('/');
          return;
        }
        // Auto-select first band if only one, or keep previous selection
        if (!selectedBand && bandsList.length === 1) {
          setSelectedBand(bandsList[0]);
        }
      } catch (e) {
        setError(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`);
        console.error('Unexpected error:', e);
      }
      setLoading(false);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    const fetchBandData = async () => {
      if (!selectedBand) return;
      setLoading(true);
      setError('');
      try {
        // Fetch members for selected band
        const { data: membersData, error: membersError } = await supabase
          .from('band_members')
          .select('id, role, user:users(id, email, full_name)')
          .eq('band_id', selectedBand.id);
        if (membersError) {
          setError(`Members fetch error: ${membersError.message}`);
          console.error('Members fetch error:', membersError);
        }
        // Fetch invites for selected band
        const { data: invitesData, error: invitesError } = await supabase
          .from('invitations')
          .select('id, email, created_at, expires_at, claimed')
          .eq('band_id', selectedBand.id);
        if (invitesError) {
          setError(`Invites fetch error: ${invitesError.message}`);
          console.error('Invites fetch error:', invitesError);
        }
        if (!membersError && !invitesError) {
          setMembers((membersData || []).map((m: any) => ({
            id: m.id,
            role: m.role,
            user: Array.isArray(m.user) ? m.user[0] : m.user
          })));
          setInvites(invitesData || []);
        }
      } catch (e) {
        setError(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`);
        console.error('Unexpected error:', e);
      }
      setLoading(false);
    };
    fetchBandData();
  }, [selectedBand]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">My Bands</h2>
        <div className="mb-4">
          {bands.length > 1 && (
            <select
              value={selectedBand?.id || ''}
              onChange={e => {
                const band = bands.find(b => b.id === e.target.value);
                setSelectedBand(band || null);
              }}
              className="border rounded px-2 py-1"
            >
              <option value="" disabled>Select a band</option>
              {bands
                .filter((bm: any) => bm.role === 'admin')
                .map((bm: any) => bm.band)
                .filter((b: any) => b && b.id && b.name)
                .map((band: any) => (
                  <option key={band.id} value={band.id}>{band.name}</option>
                ))}
            </select>
          )}
          {bands.length === 1 && <span>{bands[0].name}</span>}
          {bands.length === 0 && <span>No bands found.</span>}
        </div>
      </section>
      {selectedBand && (
        <>
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
                {members
                  .filter((m) => m.role !== "admin")
                  .map((m) => (
                    <tr key={m.id}>
                      <td>{m.user?.email}</td>
                      <td>{m.role}</td>
                      <td>
                        {/* TODO: Add actions (remove) */}
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
            <div className="mt-4">
              <button className="bg-blue-600 text-white px-4 py-2 rounded" disabled>Send Invite</button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
