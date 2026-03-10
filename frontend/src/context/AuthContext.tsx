import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { Profile, UserRole } from '../types/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
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

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Small delay to allow profile trigger to complete
          setTimeout(async () => {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
          }, 100);
        } else {
          setProfile(null);
        }

        setLoading(false);
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
  };

  const isAdmin = () => profile?.role === 'Admin';
  const isDeptHead = () => profile?.role === 'DeptHead';
  const isFaculty = () => profile?.role === 'Faculty';
  const canApprove = () => isAdmin() || isDeptHead();

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
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

