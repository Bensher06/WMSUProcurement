import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { isAdminRole, isDeptHeadRole, isFacultyUser, normalizeUserRole } from '../lib/roles';
import type { Profile, UserRole } from '../types/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  /** True while fetching `profiles` for the current session user (avoids treating "not loaded yet" as non-admin). */
  profileLoading: boolean;
  signUp: (email: string, password: string, fullName: string, role?: UserRole) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: () => boolean;
  isDeptHead: () => boolean;
  isFaculty: () => boolean;
  canApprove: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

/** If PostgREST hangs, unblock profileLoading after this; fetch still completes in background. */
const PROFILE_LOAD_STALL_MS = 10_000;

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const profileLoadGeneration = useRef(0);

  // Fetch user profile (maybeSingle: no row → null, not an error)
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,role,full_name,email,department,approved_budget,created_at,updated_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error(
          '[Auth] Profile fetch failed:',
          error.message,
          error.code ? `code=${error.code}` : '',
          error.details ? `details=${error.details}` : ''
        );
        if (error.message?.includes('404') || (error as { status?: number }).status === 404) {
          console.warn(
            '[Auth] HTTP 404 on profiles: check VITE_SUPABASE_URL and that the public.profiles table exists (run frontend/supabase/schema.sql in the SQL Editor).'
          );
        }
        return null;
      }
      if (!data) return null;
      return { ...data, role: normalizeUserRole(data.role) };
    } catch (error) {
      console.error('[Auth] Profile fetch exception:', error);
      return null;
    }
  };

  const loadProfileForUser = async (userId: string | null) => {
    if (!userId) {
      profileLoadGeneration.current += 1;
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    const gen = ++profileLoadGeneration.current;
    setProfileLoading(true);
    try {
      const fetchPromise = fetchProfile(userId);
      const outcome = await Promise.race([
        fetchPromise.then((p) => ({ kind: 'ok' as const, p })),
        new Promise<{ kind: 'stall' }>((resolve) =>
          setTimeout(() => resolve({ kind: 'stall' }), PROFILE_LOAD_STALL_MS)
        ),
      ]);
      if (gen !== profileLoadGeneration.current) return;
      if (outcome.kind === 'ok') {
        setProfile(outcome.p);
      } else {
        // Stalled: unblock UI; apply profile when fetch eventually finishes (no null flash)
        void fetchPromise.then((p) => {
          if (gen !== profileLoadGeneration.current) return;
          setProfile(p);
        });
      }
    } catch {
      if (gen !== profileLoadGeneration.current) return;
      setProfile(null);
    } finally {
      if (gen === profileLoadGeneration.current) {
        setProfileLoading(false);
      }
    }
  };

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        await loadProfileForUser(session?.user?.id ?? null);
      } catch (error) {
        console.error('Error getting session:', error);
        setLoading(false);
        setProfileLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // `getInitialSession` already loaded session + profile; this event would duplicate the
        // profiles fetch and double wait time on every page load / refresh.
        if (event === 'INITIAL_SESSION') {
          return;
        }
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        await loadProfileForUser(session?.user?.id ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: UserRole = 'Faculty') => {
    console.log('📝 Attempting signup for:', email);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          }
        }
      });

      if (error) {
        console.error('❌ Signup error:', error);
        console.dir(error, { depth: null });
        throw error;
      }

      console.log('✅ Signup successful:', data);
    } catch (err: any) {
      console.error('❌ Signup exception:', err);
      
      // Handle "Failed to fetch" specifically
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        throw new Error(
          'Unable to connect to authentication server. This usually means:\n' +
          '1. Your Supabase project may be paused (check your dashboard)\n' +
          '2. Check your internet connection\n' +
          '3. The Supabase URL in .env might be incorrect'
        );
      }
      
      throw err;
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Attempting signin for:', email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      console.log('✅ Signin successful:', data.user?.email);
    } catch (err: any) {
      // Only log unexpected errors (not invalid credentials)
      const isInvalidCreds = err?.message === 'Invalid login credentials' || err?.name === 'AuthApiError';
      if (!isInvalidCreds) console.error('❌ Signin error:', err);

      // Handle "Failed to fetch" specifically
      if (err?.message === 'Failed to fetch' || err?.name === 'TypeError') {
        throw new Error(
          'Unable to connect to authentication server. This usually means:\n' +
          '1. Your Supabase project may be paused (check your dashboard)\n' +
          '2. Check your internet connection\n' +
          '3. The Supabase URL in .env might be incorrect'
        );
      }
      
      throw err;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
    setSession(null);
    setProfileLoading(false);
  };

  const isAdmin = () => isAdminRole(profile, user);
  const isDeptHead = () => isDeptHeadRole(profile);
  const isFaculty = () => isFacultyUser(profile, user);
  const canApprove = () => isAdmin() || isDeptHead();

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    profileLoading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user && !!session,
    isAdmin,
    isDeptHead,
    isFaculty,
    canApprove
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

