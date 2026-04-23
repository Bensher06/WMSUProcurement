import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { collegesAPI } from '../lib/supabaseApi';
import { Loader2, ShieldAlert } from 'lucide-react';

/**
 * College Admin (DeptHead) UI is tied to `colleges.handler_id`. When a WMSU Admin
 * assigns a new handler, the previous user must not keep college-wide access.
 */
export default function DeptHeadCollegeGate({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const [phase, setPhase] = useState<'loading' | 'ok' | 'no_college'>('loading');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!profile?.id) {
        if (!cancelled) setPhase('ok');
        return;
      }
      if (profile.status === 'Suspended' || profile.status === 'Declined') {
        if (!cancelled) setPhase('no_college');
        return;
      }
      try {
        const colleges = await collegesAPI.getAll();
        if (cancelled) return;
        const assigned = colleges.some((c) => c.handler_id === profile.id);
        setPhase(assigned ? 'ok' : 'no_college');
      } catch {
        if (!cancelled) setPhase('no_college');
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, profile?.status]);

  if (phase === 'loading') {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
      </div>
    );
  }

  if (phase === 'no_college') {
    return (
      <div className="max-w-lg mx-auto mt-16 rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-8 h-8 shrink-0" />
          <div>
            <h1 className="text-lg font-semibold">College admin access ended</h1>
            <p className="mt-2 text-sm leading-relaxed">
              Your account is no longer linked as the College Admin for any college. If you were
              replaced, sign out and use the role you have been assigned (for example Department
              user). Contact WMSU Procurement admin if this is a mistake.
            </p>
            <button
              type="button"
              onClick={() => void signOut().then(() => (window.location.href = '/login'))}
              className="mt-4 inline-flex items-center rounded-lg bg-red-900 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
