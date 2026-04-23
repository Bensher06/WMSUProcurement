import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

/**
 * Handles Supabase auth redirects (email confirmation, magic link, OAuth PKCE).
 * Supabase appends tokens in the URL hash and/or a `code` query param; we establish
 * the session here then send the user to `/login` with a clean URL.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('Confirming your link…');

  useEffect(() => {
    let cancelled = false;

    const finish = (path: string) => {
      if (cancelled) return;
      navigate(path, { replace: true });
    };

    const run = async () => {
      try {
        const code = searchParams.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            const { data: afterExchange } = await supabase.auth.getSession();
            if (!afterExchange.session) throw exchangeError;
          }
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (cancelled) return;

        if (session?.user) {
          setMessage('Signed in. Redirecting…');
          finish('/login');
          return;
        }

        finish(
          `/login?auth_callback_error=${encodeURIComponent(
            'This sign-in link is invalid or has expired. Request a new confirmation email from the sign-up page.'
          )}`
        );
      } catch (e: unknown) {
        if (cancelled) return;
        const msg =
          e instanceof Error ? e.message : 'Could not complete sign-in from this link.';
        setMessage('Redirecting…');
        finish(`/login?auth_callback_error=${encodeURIComponent(msg)}`);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams.toString()]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white p-6">
      <Loader2 className="w-10 h-10 text-red-900 animate-spin" aria-hidden />
      <p className="text-gray-700 text-center text-sm max-w-md">{message}</p>
    </div>
  );
}
