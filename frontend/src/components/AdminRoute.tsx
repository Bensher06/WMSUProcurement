import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAdminRole, normalizeUserRole } from '../lib/roles';
import { Loader2 } from 'lucide-react';

/** Wraps routes that only Admin may access. */
export default function AdminRoute() {
  const { loading, profileLoading, profile, user } = useAuth();

  // profile fetch times out in AuthContext so profileLoading cannot hang forever
  if (loading || (profileLoading && user)) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
      </div>
    );
  }

  if (!isAdminRole(profile, user)) {
    // Only trust `profiles.role` for /faculty — JWT often still says "Faculty" after admin was set in DB
    const profileIsFaculty = profile != null && normalizeUserRole(profile.role) === 'Faculty';
    return <Navigate to={profileIsFaculty ? '/faculty' : '/'} replace />;
  }

  return <Outlet />;
}
