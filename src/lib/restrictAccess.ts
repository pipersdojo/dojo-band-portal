// src/lib/restrictAccess.ts
// Centralized access restriction logic for band portal

export type RestrictionReason =
  | 'over_member_limit'
  | 'subscription_expired'
  | null;

export interface RestrictAccessResult {
  isRestricted: boolean;
  restrictionReason: RestrictionReason;
  showAdminAlert: boolean;
  canAccess: boolean;
}

interface Band {
  id: string;
  user_limit: number;
  subscription_status: string; // e.g. 'active', 'canceled', 'lapsed'
  current_period_end: string | null; // ISO string
}

interface BandMember {
  user_id: string;
  role: 'admin' | 'member';
}

interface RestrictAccessParams {
  userId: string;
  band: Band;
  members: BandMember[];
  now?: Date; // for testing/override
}

export function restrictAccess({
  userId,
  band,
  members,
  now = new Date(),
}: RestrictAccessParams): RestrictAccessResult {
  const member = members.find((m) => m.user_id === userId);
  const isAdmin = member?.role === 'admin';
  const memberCount = members.length;
  const overMemberLimit = band.user_limit > 0 && memberCount > band.user_limit;
  const periodEnd = band.current_period_end ? new Date(band.current_period_end) : null;
  const subscriptionActive = band.subscription_status === 'active';
  const subscriptionExpired =
    !subscriptionActive && periodEnd !== null && now > periodEnd;

  // Restriction logic
  if (overMemberLimit) {
    return {
      isRestricted: !isAdmin,
      restrictionReason: 'over_member_limit',
      showAdminAlert: true,
      canAccess: isAdmin,
    };
  }
  if (subscriptionExpired) {
    return {
      isRestricted: !isAdmin,
      restrictionReason: 'subscription_expired',
      showAdminAlert: true,
      canAccess: isAdmin,
    };
  }
  // No restriction
  return {
    isRestricted: false,
    restrictionReason: null,
    showAdminAlert: false,
    canAccess: true,
  };
}

export function getRestrictionReasonMessage(reason: RestrictionReason): string | null {
  switch (reason) {
    case 'over_member_limit':
      return 'Your band has more members than allowed for your current subscription tier. Please remove members to restore access for everyone.';
    case 'subscription_expired':
      return 'Your band subscription has expired. Please renew your subscription to restore access.';
    default:
      return null;
  }
}

// Usage: Call restrictAccess() in your layout/provider and use the result to block content or show admin alerts.
// Use getRestrictionReasonMessage(result.restrictionReason) to display a human-friendly message.
