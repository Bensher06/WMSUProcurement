import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PROFILE_MIDDLE_INITIAL_MAX_LEN } from '../lib/profileConstants';
import { evaluatePassword } from '../lib/passwordRules';
import { auditAPI, profilesAPI } from '../lib/supabaseApi';
import { supabase } from '../lib/supabaseClient';
import { Eye, EyeOff, Loader2, Lock, User } from 'lucide-react';

const buildFullName = (first: string, mid: string, last: string) =>
  [first.trim(), mid.trim(), last.trim()].filter(Boolean).join(' ');

export default function AccountSettings() {
  const { profile, user } = useAuth();
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [middle, setMiddle] = useState(profile?.middle_initial || '');
  const [lastName, setLastName] = useState(profile?.family_name || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  const pwRules = useMemo(() => evaluatePassword(newPassword), [newPassword]);
  const newPwValid = pwRules.length && pwRules.uppercase && pwRules.number && newPassword === confirmPassword;
  const newDiffersFromCurrent = newPassword.length > 0 && newPassword !== currentPassword;
  const pwOk =
    currentPassword.trim().length > 0 && newPwValid && newDiffersFromCurrent;

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name || '');
    setMiddle(profile.middle_initial || '');
    setLastName(profile.family_name || '');
  }, [profile?.id, profile?.first_name, profile?.middle_initial, profile?.family_name]);

  if (!profile?.id) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-red-900" />
      </div>
    );
  }

  const onSaveProfile = async () => {
    if (!profile.id) return;
    const fn = firstName.trim();
    const ln = lastName.trim();
    const mid = middle.trim().slice(0, PROFILE_MIDDLE_INITIAL_MAX_LEN) || null;
    if (!fn || !ln) {
      setProfileMsg('First and last name are required.');
      return;
    }
    setSavingProfile(true);
    setProfileMsg('');
    try {
      const full = buildFullName(fn, mid || '', ln);
      await profilesAPI.update(profile.id, {
        first_name: fn,
        middle_initial: mid,
        family_name: ln,
        full_name: full,
      });
      await auditAPI.insert({
        event_type: 'profile_self_update',
        entity: 'profiles',
        entity_id: profile.id,
        details: { fields: ['first_name', 'middle_initial', 'family_name', 'full_name'] },
      });
      setProfileMsg('Profile saved. Refresh the page if your name does not update in the header yet.');
    } catch (e: any) {
      const raw = String(e?.message || '');
      if (raw.includes('profiles_middle_initial_len') || raw.includes('middle_initial')) {
        setProfileMsg(
          `The database still limits how long the middle name can be. Ask your admin to run the migration ` +
            `\`20260423140000_profiles_middle_initial_len_relax.sql\`, or shorten the middle field to at most ${PROFILE_MIDDLE_INITIAL_MAX_LEN} characters.`
        );
      } else {
        setProfileMsg(raw || 'Could not save profile.');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async () => {
    if (!pwOk) {
      setPwMsg(
        'Enter your current password, meet all new-password rules, confirm the new password, and use a new password that is different from your current one.'
      );
      return;
    }
    const email = (user?.email || profile.email || '').trim();
    if (!email) {
      setPwMsg('Could not determine your sign-in email. Try signing out and back in.');
      return;
    }
    setSavingPw(true);
    setPwMsg('');
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword.trim(),
      });
      if (verifyError) {
        const msg = String(verifyError.message || '').toLowerCase();
        throw new Error(
          msg.includes('invalid') || msg.includes('credential')
            ? 'Current password is incorrect.'
            : verifyError.message || 'Could not verify current password.'
        );
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      await auditAPI.insert({
        event_type: 'password_self_change',
        entity: 'auth',
        entity_id: profile.id,
        details: {},
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwMsg('Password updated.');
    } catch (e: any) {
      setPwMsg(e?.message || 'Could not update password.');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account & profile</h1>
        <p className="mt-1 text-sm text-gray-600">
          Update how your name appears and change your sign-in password. Your role and college
          assignment are managed by WMSU Procurement administrators.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <User className="h-5 w-5 text-red-900" />
          Profile
        </h2>
        <p className="mt-1 text-xs text-gray-500">Signed in as {user?.email}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              autoComplete="given-name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Middle (optional, max {PROFILE_MIDDLE_INITIAL_MAX_LEN} chars)
            </label>
            <input
              value={middle}
              onChange={(e) => setMiddle(e.target.value)}
              maxLength={PROFILE_MIDDLE_INITIAL_MAX_LEN}
              placeholder="Middle name or initial"
              autoComplete="additional-name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-600"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">Last name</label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            autoComplete="family-name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-600"
          />
        </div>
        {profileMsg ? (
          <p
            className={`mt-3 text-sm ${profileMsg.includes('saved') || profileMsg.includes('Refresh') ? 'text-green-700' : 'text-red-700'}`}
          >
            {profileMsg}
          </p>
        ) : null}
        <button
          type="button"
          disabled={savingProfile}
          onClick={() => void onSaveProfile()}
          className="mt-4 rounded-lg bg-red-900 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
        >
          {savingProfile ? 'Saving…' : 'Save profile'}
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <Lock className="h-5 w-5 text-red-900" />
          Password
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Enter your current password first, then choose a new one. You stay signed in on this device until you sign
          out.
        </p>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">Current password</label>
          <input
            type={showPw ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-600"
            placeholder="Current password"
          />
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">New password</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-red-600"
              placeholder="New password"
            />
            <button
              type="button"
              aria-label={showPw ? 'Hide passwords' : 'Show passwords'}
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <input
          type={showPw ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-600"
          placeholder="Confirm new password"
        />
        <ul className="mt-2 space-y-0.5 text-xs">
          <li className={currentPassword.trim() ? 'text-green-700' : 'text-gray-500'}>• Current password entered</li>
          <li className={pwRules.length ? 'text-green-700' : 'text-gray-500'}>• At least 8 characters</li>
          <li className={pwRules.uppercase ? 'text-green-700' : 'text-gray-500'}>• One uppercase letter</li>
          <li className={pwRules.number ? 'text-green-700' : 'text-gray-500'}>• One number</li>
          <li className={newPassword && newPassword === confirmPassword ? 'text-green-700' : 'text-gray-500'}>
            • New passwords match
          </li>
          <li className={newDiffersFromCurrent ? 'text-green-700' : 'text-gray-500'}>
            • New password is different from current
          </li>
        </ul>
        {pwMsg ? (
          <p
            className={`mt-3 text-sm ${pwMsg.includes('updated') ? 'text-green-700' : 'text-red-700'}`}
          >
            {pwMsg}
          </p>
        ) : null}
        <button
          type="button"
          disabled={savingPw || !pwOk}
          onClick={() => void onChangePassword()}
          className="mt-4 rounded-lg bg-red-900 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
        >
          {savingPw ? 'Updating…' : 'Update password'}
        </button>
      </div>
    </div>
  );
}
