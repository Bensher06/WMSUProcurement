import React, { useEffect, useRef, useState } from 'react';
import { Navigate, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../lib/supabaseApi';
import { supabase } from '../lib/supabaseClient';
import { isAdminRole, isDeptHeadUser, isFacultyUser } from '../lib/roles';
import { Mail, Lock, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { CenteredAlert } from '../components/CenteredAlert';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [resettingSession, setResettingSession] = useState(false);
  const didForceReset = useRef(false);
  const { signIn, isAuthenticated, profile, user, loading: authLoading, profileLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const forceFreshLogin = searchParams.get('fresh') === '1';

  useEffect(() => {
    if (!forceFreshLogin || authLoading || didForceReset.current) return;
    didForceReset.current = true;

    const resetIfNeeded = async () => {
      setResettingSession(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) await supabase.auth.signOut();
        // Remove `fresh` so normal post-signin redirects run.
        navigate('/login', { replace: true });
      } finally {
        setResettingSession(false);
      }
    };

    void resetIfNeeded();
  }, [forceFreshLogin, authLoading, navigate]);

  if (resettingSession || (forceFreshLogin && authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
      </div>
    );
  }

  if (isAuthenticated && !forceFreshLogin) {
    if (authLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
        </div>
      );
    }
    // After sign-in, session is ready before `profiles` loads — wait here or we Navigate to `/` too early
    if (!profile && profileLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
        </div>
      );
    }
    if (!profile) {
      return (
        <Navigate
          to={
            isAdminRole(null, user)
              ? '/users'
              : '/'
          }
          replace
        />
      );
    }
    return (
      <Navigate
        to={
          isAdminRole(profile, user)
            ? '/users'
            : isDeptHeadUser(profile)
              ? '/dept-head/dashboard'
              : isFacultyUser(profile, user)
              ? '/faculty/dashboard'
              : '/'
        }
        replace
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error('No session after sign in.');
      // Session + profile load run in AuthContext; <Navigate> above runs on next render(s)
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setForgotPasswordLoading(true);
    setForgotPasswordSuccess(false);

    try {
      await authAPI.resetPassword(forgotPasswordEmail);
      setForgotPasswordSuccess(true);
      setForgotPasswordEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <CenteredAlert error={error || undefined} success={undefined} onClose={() => setError('')} />
      <div className="w-full max-w-md">
        {/* Logo Card */}
        <div className="text-center mb-8">
          <Link to="/landing" className="inline-block">
            <div className="inline-flex items-center justify-center mb-4 cursor-pointer hover:opacity-80 transition-opacity">
              <img 
                src="/wmsu1.jpg" 
                alt="WMSU Logo" 
                className="w-32 h-32 rounded-full object-cover drop-shadow-lg"
              />
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Western Mindanao State University</h1>
          <p className="text-gray-900 mt-2 font-semibold">WMSU-Procurement</p>
          <p className="text-gray-600 mt-1 text-sm">A Smart Research University by 2040</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-red-100">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
            Welcome Back
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-red-900 hover:bg-red-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(true);
                setError('');
                setForgotPasswordSuccess(false);
              }}
              className="text-sm text-gray-700 hover:text-gray-900 hover:underline"
            >
              Forgot password
            </button>
          </div>
        </div>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-black">Reset Password</h3>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail('');
                    setError('');
                    setForgotPasswordSuccess(false);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {forgotPasswordSuccess ? (
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-black mb-2">Email Sent!</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    We've sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.
                  </p>
                  <button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordSuccess(false);
                    }}
                    className="px-4 py-2 bg-red-900 hover:bg-red-800 text-white rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-6">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>

                  {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm">{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={forgotPasswordEmail}
                          onChange={(e) => setForgotPasswordEmail(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotPassword(false);
                          setForgotPasswordEmail('');
                          setError('');
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={forgotPasswordLoading}
                        className="flex-1 px-4 py-2 bg-red-900 hover:bg-red-800 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {forgotPasswordLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          'Send Reset Link'
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-black text-sm mt-6">
          Western Mindanao State University © 2025
        </p>
      </div>
    </div>
  );
};

export default Login;

