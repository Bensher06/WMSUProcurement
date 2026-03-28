import { useAuth } from '../context/AuthContext';
import { Building2, Mail } from 'lucide-react';

/** Home for signed-in faculty (non-admin) after login. */
export default function FacultyHome() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Faculty</h1>
        <p className="text-base text-gray-500 mt-1">
          Welcome to WMSU Procurement. Use the menu when your administrator adds options for your role.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-lg">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-lg font-semibold text-red-900">
              {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">{profile?.full_name ?? 'User'}</p>
            <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4 shrink-0" />
              {profile?.email ?? '—'}
            </p>
            {profile?.department && (
              <p className="text-sm text-gray-600 flex items-center gap-2 mt-2">
                <Building2 className="w-4 h-4 shrink-0" />
                {profile.department}
              </p>
            )}
            {profile?.approved_budget != null && (
              <p className="text-sm text-gray-700 mt-2">
                Approved budget: <span className="font-medium">₱{Number(profile.approved_budget).toLocaleString()}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
