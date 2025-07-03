"use client";
import UserLogger from "../../components/UserLogger";
import { useSearchParams } from 'next/navigation';
import { TierPricingTable } from "@/components/TierPricingTable";
import { STRIPE_PRODUCT_TIERS } from "@/lib/stripeTiers";
import { BandRestrictionBanner } from './BandRestrictionBanner';
import { deleteBand } from "@/app/actions/fetchBands";

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
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [userLimit, setUserLimit] = useState<number | undefined>(undefined);
  const [newBandName, setNewBandName] = useState("");
  const [creatingBand, setCreatingBand] = useState(false);
  const [createBandError, setCreateBandError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

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
        // Check for band param in URL
        const bandParam = searchParams.get('band');
        if (bandParam) {
          const band = bandsList.find((b: any) => b.id === bandParam);
          if (band) {
            setSelectedBand(band);
          }
        } else if (!selectedBand && bandsList.length === 1) {
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
  }, [router, searchParams]);

  useEffect(() => {
    const fetchBandData = async () => {
      if (!selectedBand) return;
      setLoading(true);
      setError('');
      try {
        // Fetch user_limit for selected band
        const { data: bandRow, error: bandRowError } = await supabase
          .from('bands')
          .select('user_limit')
          .eq('id', selectedBand.id)
          .maybeSingle();
        if (!bandRowError && bandRow && bandRow.user_limit !== undefined) {
          setUserLimit(bandRow.user_limit);
        } else {
          setUserLimit(undefined);
        }
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

  // Reset selectedBand to null immediately when band param changes
  useEffect(() => {
    const bandParam = searchParams.get('band');
    if (bandParam && selectedBand && selectedBand.id !== bandParam) {
      setSelectedBand(null);
    }
  }, [searchParams, selectedBand]);

  // Sync selectedBand with band param and bands list
  useEffect(() => {
    const bandParam = searchParams.get('band');
    if (bandParam && bands.length > 0) {
      const band = bands.find((b) => b.id === bandParam);
      if (band && (!selectedBand || selectedBand.id !== band.id)) {
        setSelectedBand(band);
      }
    }
  }, [searchParams, bands]);

  // Improved loading logic to prevent blank screen flash
  const bandParam = searchParams.get('band');
  const bandsLoaded = bands.length > 0 || (!loading && bands.length === 0);
  if (!bandsLoaded || (bandParam && !selectedBand && bands.length > 0)) {
    return <div>Loading...</div>;
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  // Add band creation handler
  const handleCreateBand = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingBand(true);
    setCreateBandError("");
    try {
      // Fetch current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      // Create band
      const { data: band, error: bandError } = await supabase
        .from('bands')
        .insert({ name: newBandName })
        .select()
        .maybeSingle();
      if (bandError || !band) throw new Error(bandError?.message || "Failed to create band");
      // Add user as admin
      const { error: memberError } = await supabase
        .from('band_members')
        .insert({ user_id: user.id, band_id: band.id, role: 'admin' });
      if (memberError) throw new Error(memberError.message);
      setNewBandName("");
      // Refresh bands
      setBands((prev) => [...prev, band]);
      setSelectedBand(band);
    } catch (err: any) {
      setCreateBandError(err.message || "Failed to create band");
    }
    setCreatingBand(false);
  };

  async function handleDeleteBand() {
    if (!selectedBand) return;
    if (!confirm(`Are you sure you want to delete the band "${selectedBand.name}" and all its data? This cannot be undone.`)) return;
    setDeleting(true);
    setDeleteError("");
    // Debug: log current user before delete
    const { data: { user } } = await supabase.auth.getUser();
    console.log('[DEBUG] Current user before delete:', user);
    if (!user) {
      setDeleteError('Not authenticated.');
      alert('Not authenticated.');
      setDeleting(false);
      return;
    }
    // Only run full deleteBand (no direct delete)
    const result = await deleteBand(selectedBand.id);
    console.log('[DEBUG] deleteBand result:', result); // <--- DEBUG LOG
    if (result.error) {
      setDeleteError(result.error);
      alert('Delete error: ' + result.error); // <--- DEBUG ALERT
    } else {
      setBands(bands.filter(b => b.id !== selectedBand.id));
      setSelectedBand(null);
      router.push('/'); // <--- Redirect to main dashboard after delete
    }
    setDeleting(false);
  }

  return (
    <>
      <UserLogger />
      <div className="max-w-3xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">My Bands</h2>
          {/* Removed Add Band Form - now handled in AppNav */}
          <div className="mb-4">
            {bands.length > 1 && !selectedBand && (
              <select
                value={selectedBand ? selectedBand.id : ''}
                onChange={e => {
                  const band = bands.find((b: Band) => b.id === e.target.value);
                  setSelectedBand(band || null);
                }}
                className="border rounded px-2 py-1"
              >
                <option value="" disabled>Select a band</option>
                {bands.map((band: Band) => (
                  <option key={band.id} value={band.id}>{band.name}</option>
                ))}
              </select>
            )}
            {selectedBand && <span>{selectedBand.name}</span>}
            {bands.length === 0 && <span>No bands found.</span>}
          </div>
          {selectedBand && (
            <div className="mb-4 flex items-center gap-4">
              <a
                href={`/band/${selectedBand.id}`}
                className="text-blue-600 underline"
              >
                View Band Page
              </a>
              <button
                className="bg-red-600 text-white px-4 py-2 rounded font-semibold hover:bg-red-700 transition disabled:opacity-60"
                onClick={handleDeleteBand}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Band"}
              </button>
            </div>
          )}
          {deleteError && <div className="text-red-600 mb-2">{deleteError}</div>}
        </section>
        {selectedBand && (
          <>
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-2">Band Members</h2>
              {/* Restriction banner for this band */}
              <BandRestrictionBanner
                bandId={selectedBand.id}
                userLimit={userLimit}
                members={members}
                invites={invites}
              />
              {/* Members/Invites usage summary */}
              <div className="mb-2 text-gray-700 font-medium">
                {`Members & Invites: ${members.length + invites.filter(inv => !inv.claimed).length} of ${userLimit ?? '...'} allowed`}
              </div>
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
                          <button
                            className="text-red-600 hover:underline"
                            onClick={async () => {
                              if (!window.confirm(`Remove ${m.user?.email} from this band?`)) return;
                              setLoading(true);
                              setError("");
                              try {
                                const { error: removeError } = await supabase
                                  .from('band_members')
                                  .delete()
                                  .eq('id', m.id);
                                if (removeError) {
                                  setError(`Remove error: ${removeError.message}`);
                                } else {
                                  setMembers(members.filter(mem => mem.id !== m.id));
                                }
                              } catch (e) {
                                setError(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`);
                              }
                              setLoading(false);
                            }}
                          >
                            Remove
                          </button>
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
                        <button
                          className="text-red-600 hover:underline mr-2"
                          onClick={async () => {
                            if (!window.confirm(`Revoke invite for ${inv.email}?`)) return;
                            setLoading(true);
                            setError("");
                            try {
                              const res = await fetch("/api/revoke-invite", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ inviteId: inv.id }),
                              });
                              const data = await res.json();
                              if (!res.ok) {
                                setError(data.error || "Failed to revoke invite");
                              } else {
                                setInvites(invites.filter(i => i.id !== inv.id));
                              }
                            } catch (e) {
                              setError(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`);
                            }
                            setLoading(false);
                          }}
                        >
                          Revoke
                        </button>
                        <button
                          className="text-blue-600 hover:underline"
                          onClick={async () => {
                            setLoading(true);
                            setError("");
                            try {
                              const res = await fetch("/api/resend-invite", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ inviteId: inv.id }),
                              });
                              const data = await res.json();
                              if (!res.ok) {
                                setError(data.error || "Failed to resend invite");
                              } else {
                                setInviteSuccess("Invite resent!");
                              }
                            } catch (e) {
                              setError(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`);
                            }
                            setLoading(false);
                          }}
                        >
                          Resend
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Show invite error above the form, outside the flex row */}
              {inviteError && <div className="text-red-600 mb-2">{inviteError}</div>}
              <form
                className="mt-4 flex gap-2 items-center"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setInviteLoading(true);
                  setInviteSuccess("");
                  setInviteError("");
                  try {
                    const res = await fetch("/api/invite-member", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: inviteEmail, bandId: selectedBand?.id }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      setInviteError(data.error || "Failed to send invite");
                    } else {
                      setInviteSuccess("Invite sent!");
                      setInviteEmail("");
                      // Refresh invites
                      const { data: invitesData, error: invitesError } = await supabase
                        .from('invitations')
                        .select('id, email, created_at, expires_at, claimed')
                        .eq('band_id', selectedBand.id);
                      if (!invitesError) setInvites(invitesData || []);
                    }
                  } catch (e) {
                    setInviteError(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`);
                  }
                  setInviteLoading(false);
                }}
              >
                <input
                  type="email"
                  className="border rounded px-2 py-1 w-80"
                  placeholder="Invite email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  required
                  disabled={inviteLoading}
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                  disabled={!inviteEmail || inviteLoading}
                >
                  {inviteLoading ? "Sending..." : "Send Invite"}
                </button>
                {inviteSuccess && <span className="text-green-600 ml-2">{inviteSuccess}</span>}
              </form>
            </section>
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-2">Billing</h2>
              {/* Subscription status and actions */}
              <BillingSection selectedBand={selectedBand} />
            </section>
          </>
        )}
      </div>
    </>
  );
}

// BillingSection component
function BillingSection({ selectedBand }: { selectedBand: Band }) {
  const [subStatus, setSubStatus] = useState<string | null>(null);
  const [renewal, setRenewal] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [stripeProductId, setStripeProductId] = useState<string | null>(null);
  const [userLimit, setUserLimit] = useState<number | null>(null);
  const [tierInfo, setTierInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);

  // Get selected tier name for button label
  const selectedTier = selectedPriceId ? Object.values(STRIPE_PRODUCT_TIERS).find(t => t.priceId === selectedPriceId) : null;

  useEffect(() => {
    // Fetch band subscription info from Supabase
    const fetchSub = async () => {
      setLoading(true);
      setError(null);
      // Fetch band row
      const { data: band, error: bandError } = await supabase
        .from('bands')
        .select('subscription_status, current_period_end, stripe_customer_id, stripe_product_id, user_limit')
        .eq('id', selectedBand.id)
        .maybeSingle();
      if (bandError) setError(bandError.message);
      setSubStatus(band?.subscription_status || null);
      setRenewal(band?.current_period_end ? new Date(band.current_period_end).toLocaleString() : null);
      setCustomerId(band?.stripe_customer_id || null);
      setStripeProductId(band?.stripe_product_id || null);
      setUserLimit(band?.user_limit ?? null);
      // Fetch current user email
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
      // Get tier info from STRIPE_PRODUCT_TIERS
      if (band?.stripe_product_id && STRIPE_PRODUCT_TIERS[band.stripe_product_id]) {
        setTierInfo(STRIPE_PRODUCT_TIERS[band.stripe_product_id]);
      } else {
        setTierInfo(null);
      }
      setLoading(false);
    };
    fetchSub();
  }, [selectedBand]);

  const handleStartSubscription = async () => {
    setLoading(true);
    setError(null);
    if (!selectedPriceId || !userEmail) {
      setError('Please select a tier.');
      setLoading(false);
      return;
    }
    const res = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId: selectedPriceId, bandId: selectedBand.id, userEmail }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.url) {
      window.location.href = data.url;
    } else {
      setError(data.error || 'Failed to start subscription');
    }
  };

  const handleManageBilling = async () => {
    setLoading(true);
    setError(null);
    if (!customerId) {
      setError('No Stripe customer ID found for this band.');
      setLoading(false);
      return;
    }
    const res = await fetch('/api/stripe/create-customer-portal-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.url) {
      window.location.href = data.url;
    } else {
      setError(data.error || 'Failed to open billing portal');
    }
  };

  return (
    <div className="border rounded p-4 bg-gray-50">
      {loading && <div>Loading billing info...</div>}
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <div className="mb-2">
        <span className="font-medium">Subscription Status:</span> {subStatus || 'Not Subscribed'}
        {tierInfo && (
          <>
            <div className="text-sm text-gray-700 mt-1">
              <b>Tier:</b> {tierInfo.name}<br />
              <b>Yearly Price:</b> ${tierInfo.yearlyPrice}<br />
              <b>Member Limit:</b> {tierInfo.memberLimit}
            </div>
          </>
        )}
        {userLimit !== null && (
          <div className="text-sm text-gray-700">(Current user limit: {userLimit})</div>
        )}
      </div>
      {renewal && (
        <div className="mb-2">
          <span className="font-medium">Renews:</span> {renewal}
        </div>
      )}
      {(!subStatus || subStatus === 'lapsed' || subStatus === 'cancelled') ? (
        <>
          <TierPricingTable
            onSelect={(priceId) => setSelectedPriceId(priceId)}
            selectedPriceId={selectedPriceId || undefined}
            disabled={loading}
          />
          {selectedTier && (
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
              onClick={handleStartSubscription}
              disabled={loading}
            >
              {`Start Subscription: ${selectedTier.name}`}
            </button>
          )}
        </>
      ) : (
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={handleManageBilling}
          disabled={loading}
        >
          Manage Billing
        </button>
      )}
    </div>
  );
}
