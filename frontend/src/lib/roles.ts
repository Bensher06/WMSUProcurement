import type { User } from '@supabase/supabase-js';
import type { Profile, UserRole } from '../types/database';

/** Map any DB / JWT string to canonical `UserRole` (fixes `admin` vs `Admin`, stray spaces, etc.). */
export function normalizeUserRole(raw: string | null | undefined): UserRole {
  const s = (raw ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (s === 'admin' || s === 'administrator') return 'Admin';
  if (s === 'depthead' || s === 'dept head' || s === 'dept_head') return 'DeptHead';
  if (s === 'faculty' || s === '') return 'Faculty';
  // Unknown values: default to Faculty for legacy rows; explicit admin strings handled above
  return 'Faculty';
}

export function jwtSaysAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const app = user.app_metadata as Record<string, unknown> | undefined;
  const candidates = [meta?.role, meta?.user_role, app?.role, app?.user_role];
  for (const c of candidates) {
    if (typeof c !== 'string') continue;
    const t = c.trim().toLowerCase();
    if (t === 'admin' || t === 'administrator') return true;
  }
  return false;
}

export function jwtSaysFaculty(user: User | null | undefined): boolean {
  if (!user) return false;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const app = user.app_metadata as Record<string, unknown> | undefined;
  const candidates = [meta?.role, meta?.user_role, app?.role, app?.user_role];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().toLowerCase() === 'faculty') return true;
  }
  return false;
}

/** Admin from normalized `profiles.role` or JWT metadata. */
export function isAdminRole(profile: Profile | null | undefined, user: User | null | undefined): boolean {
  if (normalizeUserRole(profile?.role) === 'Admin') return true;
  return jwtSaysAdmin(user);
}

export function isDeptHeadRole(profile: Profile | null | undefined): boolean {
  return normalizeUserRole(profile?.role) === 'DeptHead';
}

export function isFacultyRole(profile: Profile | null | undefined): boolean {
  return normalizeUserRole(profile?.role) === 'Faculty';
}

/**
 * Full-page spinner on /faculty while profiles row loads — except when JWT already says
 * faculty (not admin), so refresh feels instant for typical faculty accounts.
 */
export function shouldBlockFacultyRouteForProfileLoading(
  profile: Profile | null | undefined,
  user: User | null | undefined,
  profileLoading: boolean
): boolean {
  if (!profileLoading || !user) return false;
  if (profile != null) return false;
  // Typical faculty signup has user_metadata.role = faculty — refresh without waiting on PostgREST
  if (jwtSaysFaculty(user) && !jwtSaysAdmin(user)) return false;
  return true;
}

/** Faculty end-user for routing (profile and/or JWT); excludes Admin/DeptHead. */
export function isFacultyUser(profile: Profile | null | undefined, user: User | null | undefined): boolean {
  if (isAdminRole(profile, user)) return false;
  if (normalizeUserRole(profile?.role) === 'DeptHead') return false;
  if (profile != null && normalizeUserRole(profile.role) === 'Faculty') return true;
  if (!profile && jwtSaysFaculty(user)) return true;
  return false;
}
